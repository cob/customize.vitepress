import com.cultofbits.integrationm.service.dictionary.recordm.RecordmSearchHit
import groovy.transform.Field
import utils.MdadosConfig
import vitepress.GitlabVitepressConfig

import javax.ws.rs.client.ClientBuilder
import javax.ws.rs.client.Entity
import javax.ws.rs.core.Form
import javax.ws.rs.core.MediaType

@Field String PIPELINE_URI = "https://gitlab.com/api/v4/projects/<id>/trigger/pipeline"

def costumerDataId = Integer.parseInt(argsMap.id)

def changesInstance = recordm.get(costumerDataId).body
def tag = changesInstance.value('Name')

def ref = "master"

// passar status a published, e das origens a inactive
updateDevelopmentStatus(tag)

// wait 1s, to make sure all changes are indexed
sleep(1000)

// Como existem componentes que são esmagados, tudo o que
// apontava para os antigos, tem que agora apontar para os novos
redirectRefs(tag)

recordm.update("Changes", "name:\"$tag\"", [
        "Estado Deploy" : "Preparing Build environment",
        "Estado Index" : 0,
        "Deploy Progress" : 0
])

def isOk = launch_pipeline(GitlabVitepressConfig.PROJECT_ID, tag, ref)
return json(isOk ? 200 : 500, [ success : isOk ])


def updateDevelopmentStatus( String tag ) {
    updateStatusOfDef("Contents" , tag)
    updateStatusOfDef("Site Page", tag)
}

def updateStatusOfDef(String definition, String tag) {
    def elementsOfTag = recordm.search(definition, "changes_reference:\"${tag}\"")
    if (elementsOfTag.total > 0) {
        def hits = elementsOfTag.hits
        hits.forEach { publishThisDeactivateOrigin(definition, it) }
    }
}

def publishThisDeactivateOrigin(String definition, RecordmSearchHit hit) {
    recordm.update(definition, hit.id, ["Development Status" : "Published"])

    def origin = hit.value("Origin") as Integer
    if(origin)
        recordm.update(definition, origin, ["Development Status" : "Inactive"] )
}


def redirectRefs(tag) {
    // site pages que apontem para o antigo mudam para o novo
    // parametros que apontem para o nov, mudam
    def contentsOfTag = recordm.search("Contents", "changes_reference:\"${tag}\" ").hits

    contentsOfTag.forEach {hit ->
        def origin = hit.value("Origin") as Integer

        if(!origin)
            return

        recordm.search("Site Page", "development_status:(\"Published\" OR \"In Development\") (level_1:$origin OR level_2:$origin OR level_3:$origin OR level_4:$origin)").hits.forEach {page ->
            def updates = [:]
            def sitePage = recordm.get(page.id)
            def strcutedInstance = buildSimpleInstance(sitePage.body.raw.fields.find({ it.fieldDefinition.name == "Content" }).fields)["Level 1"]

            for (i in 0..<strcutedInstance.size()) {
                createUpdates(strcutedInstance[i], 1, origin, i).forEach {
                    updates[it] = hit.id
                }
            }

            recordm.update("Site Page", page.id, updates)

        }

        recordm.update("Layout Parameters", "development_status:\"Published\" value:$origin", ["Value" : hit.id ])
    }

    recordm.search("Site Page", "changes_reference:\"${tag}\"").hits.forEach {hit ->
        def origin = hit.value("Origin") as Integer

        if(!origin)
            return

        recordm.update("Site", "home_page:$origin", ["Home Page" : hit.id])
        recordm.update("Layout Parameters", "development_status:\"Published\" value:$origin", ["Value" : hit.id ])
    }

}

// levelDict is a dictinonary with the following structure { Level X+1 : [children], Level X : value
def createUpdates(levelDict, levelIndex, origin, levelDuplicateIndex) {
    if(levelIndex >= 5 || levelDict == null )
        return []

    def childUpdates = []

    if(levelIndex < 4) {
        def children = levelDict["Level ${levelIndex + 1}"]
        for (i in 0..<children.size()) {
            def thisChildUpdates = createUpdates(children[i], levelIndex + 1, origin, i)
            childUpdates += thisChildUpdates.collect{ u -> "Level ${levelIndex}[$levelDuplicateIndex]/" + u}
        }
    }

    if( (levelIndex <= 3 && levelDict["Level $levelIndex"] == (origin + "")) ||
        (levelIndex == 4 && levelDict == (origin + "") )) {
        childUpdates.add("Level ${levelIndex}[$levelDuplicateIndex]")
    }

    return childUpdates


}


def buildSimpleInstance(rmRawFields) {
    def simplifiedInstance = [:]

    rmRawFields.each { f ->
        def fName = f.fieldDefinition.name
        def fValue = f.value
        def fFields = f.fields
        def fDuplicable = f.fieldDefinition.duplicable
        if(fFields) {
            def newEntry = buildSimpleInstance(fFields)
            newEntry[fName] = fValue
            if(!simplifiedInstance[fName]) {
                simplifiedInstance[fName] = fDuplicable ? [newEntry] : newEntry
            } else if(simplifiedInstance[fName] instanceof List) {
                simplifiedInstance[fName] << newEntry
            } else {
                simplifiedInstance[fName] = [simplifiedInstance[fName], newEntry]
            }
        } else {
            if(!simplifiedInstance[fName]) {
                simplifiedInstance[fName] = fDuplicable ? [fValue] : fValue
            } else {
                simplifiedInstance[fName] << fValue
            }
        }
    }
    return simplifiedInstance
}





def launch_pipeline(id, tag, ref) {

    recordm.update("Changes", "name:\"$tag\"", [
            "Estado Deploy" : "",
            "Estado Index" : "",
            "Deploy Progress" : 20
    ])

    def target = PIPELINE_URI.replace('<id>', id)

    def form = new Form()
            .param('variables[STAGE_OR_PROD]', "PROD")
            .param('variables[DIR_NAME]', tag)
            .param('variables[ENV]', MdadosConfig.VITEPRESS_PIPELINE_ENV)
            .param('ref', ref)
            .param('token', GitlabVitepressConfig.GITLAB_PIPELINE_TRIGGER_TOKEN)

    def response = ClientBuilder.newClient().target(target)
            .request(MediaType.APPLICATION_JSON)
            .post(Entity.entity(form, MediaType.APPLICATION_FORM_URLENCODED))

    log.info("Pipeline returned with status: ${response.status}, response: ${response.statusInfo}")

    return response.status > 200 && response.status < 300
}