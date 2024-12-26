import { ContentFile } from './../schema/textual-content';
import { rmDefinitionSearch, umLoggedin } from '@cob/rest-api-wrapper';
import { ref, Ref } from "vue"

export function someCommonGroup(groups_string, groups_userm) {
    return groups_string.some( rg => groups_userm.some( g => g.name == rg) ) 
}

export function hasAccess(restrictedGroups: string[]) : Ref<Boolean | undefined> {

    const hasAccess = ref<undefined | Boolean>(undefined)

    umLoggedin(true)
        .then(userInfo => hasAccess.value = someCommonGroup(restrictedGroups, userInfo.groups) || isSystem(userInfo) )
        .catch( _ => hasAccess.value = false )
    
    return hasAccess
}

export function isLoggedOn() : Ref<Boolean | undefined>{    

    const loggedOn = ref<Boolean | undefined>(undefined)

    umLoggedin(true)
        .then(userInfo => { loggedOn.value = userInfo.username != 'anonymous'})
        .catch( () => { loggedOn.value = false})

    return  loggedOn
}

export function isSystem(userInfo) { 
    return userInfo.groups.some( g => g.name == "System" )
} 

export { umLoggedin }

const idOfFileField = (hit, name="File") => 
    name == "File" ?
      hit._source._definitionInfo.instanceLabel.find( f => f.name == name ).id
    : hit._source._definitionInfo.instanceDescription.find( f => f.name == name ).id 


export async function filesOf(id: number, originalSize=true) : Promise<ContentFile[]> {

    const getFile = (hit) => {
        if(originalSize || (!hit._source.reduced_file && hit._source.file))
            return { kind: 'link', file : url(hit._id, idOfFileField(hit), hit._source.file[0]) }
        else if( hit._source.reduced_file )
            return { kind : 'link', file : url(hit._id, idOfFileField(hit, "Reduced File"), hit._source.reduced_file[0]) }
        else if( hit._source.link )
            return { kind: 'link', file : hit._source.link[0] }
        else if(hit._source.id_video)
            return { kind : 'id', file: hit._source.id_video[0] }
        else 
            return undefined
            
    }

    const url = (id, fieldId, fileName) => {
        return `/recordm/recordm/instances/${id}/files/${fieldId}/${fileName}`
    }

    const files = await rmDefinitionSearch("LRN Files", `contents:${id}`, 0, 20 )
        .then(r => r.hits.hits)
        .then(hits => hits
            .map(h => getFile(h)));
    return files 
}