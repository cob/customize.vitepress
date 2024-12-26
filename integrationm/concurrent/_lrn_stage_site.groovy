import groovy.transform.Field
import vitepress.GitlabVitepressConfig

import javax.ws.rs.client.Client
import javax.ws.rs.client.ClientBuilder
import javax.ws.rs.client.Entity
import javax.ws.rs.core.Form
import javax.ws.rs.core.MediaType

import utils.MdadosConfig

@Field String PIPELINE_URI = "https://gitlab.com/api/v4/projects/<id>/trigger/pipeline"


def tag = argsMap.tag
def id = argsMap.id ?: GitlabVitepressConfig.PROJECT_ID
def ref = argsMap.ref ?: "master"

recordm.update("Changes", "name:\"$tag\"", [
        "Estado Deploy" : "Preparing Build environment",
        "Estado Index" : 0,
        "Deploy Progress" : 0
])

def target = PIPELINE_URI.replace('<id>', id)

def form = new Form()
                .param('variables[TAG]', tag)
                .param('variables[STAGE_OR_PROD]', "STAGE")
                .param('variables[DIR_NAME]', tag)
                .param('variables[ENV]', MdadosConfig.VITEPRESS_PIPELINE_ENV)
                .param('ref', ref)
                .param('token', GitlabVitepressConfig.GITLAB_PIPELINE_TRIGGER_TOKEN)

def response = ClientBuilder.newClient().target(target)
        .request(MediaType.APPLICATION_JSON)
        .post(Entity.entity(form, MediaType.APPLICATION_FORM_URLENCODED))

log.info("Pipeline returned with status: ${response.status}, response: ${response.statusInfo}")
def isOk  = response.status > 200 && response.status < 300

return json(isOk ? 200 : 500, [ success : isOk ])

