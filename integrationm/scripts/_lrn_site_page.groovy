import com.cultofbits.integrationm.service.dictionary.recordm.RecordmMsg

if(msg.definitionName == "Site Page" && msg.value("Development Status") == "In Development") {
    
    if(relevantFieldsChanges(msg)) {
        def changesInstance = msg.value("Changes", Integer) as Integer
        if(changesInstance)
            recordm.update("Changes", changesInstance, ["Estado Deploy" : "", "Estado Index" : ""])
    }   

    if(msg.action == "add") {

        def originId = msg.value("Origin")
        if(originId != null) {

            def origin = recordm.get(originId).body

        // Duplicate structure
        def levels = buildSimpleInstance(origin.raw.fields.find({ it.fieldDefinition.name == "Content" }).fields)["Level 1"]
        def i = 0
        def updates = [
                "Layout"        : origin.value("Layout") ?: "",
                "Has Content?"   : origin.value("Has Content?") ?: "",
                "Content Layout": origin.value("Content Layout") ?: "",
                "Name"          : origin.value("Name") ?: ""
        ]

            levels.forEach {
                def ls = buildStructure(1, i, it)
                ls.forEach { u -> updates[u[0]] = u[1] }
                i++
            }

            recordm.update("Site Page", msg.id, updates)

            // Duplicate parameters
            def fields = ["Locale", "Group", "Group Order", "Name", "Parameter Order", "Type", "Value"]
            recordm.search("Layout Parameters", "page:${origin.id}").hits.forEach {
                def copiedParam = [
                        "Page": msg.id,
                ]
                fields.forEach { f -> copiedParam[f] = it.value(f) }
                recordm.create("Layout Parameters", copiedParam)
            }
        }
    }
}


static def relevantFieldsChanges(RecordmMsg msg) {
    return msg.field("Name").changed() ||
            msg.field("Layout").changed() ||
            msg.field("Development Status").changed() ||
            msg.field("Content Layout").changed() ||
            msg.field("Level 1").changed() ||
            msg.field("Level 2").changed() ||
            msg.field("Level 3").changed() ||
            msg.field("Level 4").changed() ||
}


def buildStructure(level, i, structure) {
    if(structure == null)
        return []

    if(structure instanceof  String)
        return [["Level $level[$i]", structure]]

    def updates = []
    def currentKey = "Level $level[$i]"
    def currentVal = structure["Level $level"]

    if(currentVal == null)
        return []

    def nextLevel = structure["Level ${level + 1}"]

    updates.add([currentKey, currentVal])
    if(nextLevel) {
        for (j in 0..<nextLevel.size()) {
            def children = buildStructure(level + 1, j, nextLevel[j])
            children.forEach{ c ->
                def k = c[0]
                def v = c[1]
                def prefix = "$currentKey/$k"
                updates.add([prefix, v])
            }
        }

    }

    return updates

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
