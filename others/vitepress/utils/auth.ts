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

const idOfFileField = (hit) => hit._source._definitionInfo.instanceLabel.find( f => f.name == "File" ).id

export async function filesOf(id: number) : Promise<string[]> {
    const files = await rmDefinitionSearch("LRN Files", `contents:${id}`, 0, 20 )
        .then(r => r.hits.hits)
        .then(hits => hits
            .map(h => `/recordm/recordm/instances/${h._id}/files/${idOfFileField(h)}/${h._source.file[0]}`));
    return files 
}