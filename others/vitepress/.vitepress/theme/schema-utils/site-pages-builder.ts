import { rmDefinitionSearch } from '@cob/rest-api-wrapper';
import { THREAD_LIMIT, createIdFromName } from "./shared";
import RmInstanceField from '../ts-cob/RmInstanceField';
import RmInstance from "../ts-cob/RmInstance";
import { SitePage } from "../schema/site-page";
import { Content, ContentNode, ContentTree } from "../schema/content-tree";
import { buildTemplates } from "./parameter-builder";
import { LocaleData } from '../schema/site';
import sendRequests from './requests';
import { TextualContent } from '../schema/textual-content';


// Receives an RmInstance and returns the equivalent SitePage
// This involves:
//  - creating its id
//  - reading its name and layout from the instance
//  - buildings its parameters
//  - building its content tree 
async function instanceToPage(rmi: RmInstance, tag: string, locData: LocaleData, home: boolean): Promise<SitePage> {
    
    let params = await buildTemplates(rmi, locData)

    let name = rmi.value("Name")
    if(!name)
        throw new Error(`Site Page ${rmi.id} does not have a name`)

    let path = home ? "" : createIdFromName(name)
    let topLevels = rmi.fields("Level 1")
    let docLayout = rmi.field("Content Layout")?.label
    let layout = rmi.field("Layout")?.label

    if(!layout ) 
        throw new Error(`Cannot access $ref label layout in site page ${rmi.id} - there is probably an indexing error`)

    const alternative = rmi.fields("Page Alternative").filter( p => p.value("Version Name") == tag)[0]
    


    if(alternative) {
        // only change name if value is present and it is not a home (in which case, it'll be an index regardless)
        let alternateName = alternative.value("Name") 
        path = alternateName && alternateName != "" && !home ? createIdFromName(alternateName) : path
        
        topLevels = alternative.fields("Level 1") ?? topLevels
        docLayout = alternative.value("Content Layout") ?? docLayout 
        layout = alternative.field("Layout")?.label ?? layout
        name = alternateName ?? name        
    }

    let content : ContentTree | undefined = undefined
    const hasContent = rmi.value("Has Content?") == "Yes"
    if(hasContent) {
        
        const emptyTopLevels = topLevels.filter( f => !f.value() ) 

        if(emptyTopLevels.length > 0)
            throw new Error(`You have empty top levels despite indicating there is content.`)
        
        if(!docLayout)
            throw new Error(`Cannot access $ref label of doc layout in site page ${rmi.id} - there is probably an indexing error`)

        content =  await instanceToContent(topLevels, docLayout, path + "/", tag)
    }

    return {
        path: home ? "index" : path + (content ? "/index" : ""),
        layout: layout, 
        params: params,
        name: name ,
        content: content,
        instanceId: rmi.id
    }    
}    


// Creates a content tree according to an instance
// Involves fetching the upper level content, and go down from there
async function instanceToContent (topLevels: RmInstanceField[], layout: string ,path: string, tag: string): Promise<ContentTree> {

    const l1s : ContentNode[] =  await sendRequests (topLevels.map( l1 => () => toNode(l1, path, tag) ) )

    return {
        layout: layout,
        L1s: l1s
    }
}


// Converts a content field (RecordM side) into a content node (Vitepress side) 
// Is recursive, to convert all its children
async function toNode(field: RmInstanceField, path: string, tag: string): Promise<ContentNode> {
   
    if(!field.label)
       throw new Error(`cannot access $ref label for a Level field, child of ${path} - there is probably an indexing error`)

    let pathOf = path + createIdFromName(field.label)
    
    const children = field.allFields.filter( f => f.value() )

    if(children.length > 0)
        pathOf += "/"

    const childrenNodes : ContentNode[] = await sendRequests(children.map( c => () => toNode(c, pathOf, tag)))

    return {
        path: pathOf + ( children.length > 0 ? "index" : ""),
        current: await contentsOf(field.valueAsNumber()!, pathOf + ( children.length > 0 ? "index" : ""), tag),
        children: childrenNodes
    }
}

// Gets the content of a page, for each locale
async function contentsOf(id: number, path: string, tag: string): Promise<Content> {
    return RmInstance.load(id).then( instance => {
        const common = {
            instance: instance.id, 
            path: path, 
            filepaths: instance.fields("File").map( f => buildPathLink(f, id) ),
            restrictions: instance.field("Visibility")?.values("Audience Group") ?? [],
        } 
        return { 
            instanceId : instance.id,
            locales: availableContent(instance, tag, common)
    }})
}

function buildPathLink(field: RmInstanceField, id: number) {
    return `/recordm/recordm/instances/${id}/files/${field.fieldDefinition.id}/${field.value()}`
}

function availableContent(instance: RmInstance, tag : string, common) {

    const nameGroupToContent = (nameGroup: RmInstanceField) => {

        const localeCode = nameGroup.field("Locale")?.label
        if(!localeCode)
            throw new Error(`cannot access $ref label for locale with id ${nameGroup.field("Locale")?.value()} in ${nameGroup.value()} - there is probably an indexing error`)
        
        return {
            ...common,
            title: nameGroup.value()!,
            localeCode: nameGroup.field("Locale")?.label,
            content: nameGroup.value("Content")
        } 
    }

    // Fetch staged that has the tag, convert it to content 
    const stagedWithTag = instance.fields("Staged Content Name")
        .filter( field => 
            field.value("Locale") &&  
            field.value("Version Name") == tag && 
            field.value() && field.value("Content") )
        .map( nameGroupToContent )

    // fetch the published ones that are not overwritten by staged and convert to content
    const publishLocales = instance
            .fields("Name")
            .filter( ploc => 
                !stagedWithTag.some( staged => staged.localedCode == ploc.field("Locale")?.label ) 
            ).map( nameGroupToContent )
        
    return publishLocales.concat(stagedWithTag)
}

// TODO make this depend on navbar and footer and other sitepages, so the site is built recursively and only with exactly is necessary
// Query RecordM to get the ids of all the SitePages to build
const getIds = (): Promise<number[]> =>
         rmDefinitionSearch("Site Page", "*", 0, 500)
            .then(resp => resp.hits.hits)
            .then(hits => hits.map(hit => hit._source.instanceId))


// Builds the sitepages of the site
export async function buildSitePages(tag: string, locData: LocaleData, homeId : number) { 
    const ids = await getIds();
    const instances: RmInstance[] = await sendRequests( ids.map( id => () => RmInstance.load(id) )  )
    const pages: SitePage[] = await Promise.all(instances.map(rmi => instanceToPage(rmi, tag, locData, rmi.id == homeId)))
    
    return pages
}
