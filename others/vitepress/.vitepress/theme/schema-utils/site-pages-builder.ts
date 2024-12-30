import { ContentFile, TextualContent } from './../schema/textual-content';
import { Locale } from './../schema/template-parameters';
import { rmDefinitionSearch } from '@cob/rest-api-wrapper';
import { THREAD_LIMIT, createIdFromName } from "./shared";
import RmInstanceField from '../ts-cob/RmInstanceField';
import RmInstance from "../ts-cob/RmInstance";
import { SitePage } from "../schema/site-page";
import { Content, ContentNode, ContentTree } from "../schema/content-tree";
import { buildTemplates } from "./parameter-builder";
import { LocaleData } from '../schema/site';
import sendRequests from './requests';


// Receives an RmInstance and returns the equivalent SitePage
// This involves:
//  - creating its id
//  - reading its name and layout from the instance
//  - buildings its parameters
//  - building its content tree 
async function instanceToPage(rmi: RmInstance, tag: string, locData: LocaleData, home: boolean): Promise<SitePage> {

    let replaces : number | undefined = undefined
    let name = rmi.value("Name")
    if (!name)
        throw new Error(`Site Page ${rmi.id} does not have a name`)
    
    
    if(tag) {
        const alternativeSearch = (await rmDefinitionSearch("Site Page", `origin:${rmi.id} changes_reference:"${tag}"`, 0, 1000)).hits
        if(alternativeSearch.total.value > 0) {
            replaces = rmi.id
            rmi = await RmInstance.load(alternativeSearch.hits[0]._id)
        }
    }
    
    let params = await buildTemplates(rmi, locData)
    let path = home ? "" : createIdFromName(name)
    let topLevels = rmi.fields("Level 1")
    let docLayout = rmi.field("Content Layout")?.label
    let layout = rmi.field("Layout")?.label

    if (!layout)
        throw new Error(`Cannot access $ref label layout in site page ${rmi.id} - there is probably an indexing error`)

    let content: ContentTree | undefined = undefined
    const hasContent = rmi.value("Has Content?") == "Yes"
    if (hasContent) {

        const emptyTopLevels = topLevels.filter(f => !f.value())

        if (emptyTopLevels.length > 0)
            throw new Error(`You have empty top levels despite indicating there is content.`)

        if (!docLayout)
            throw new Error(`Cannot access $ref label of doc layout in site page ${rmi.id} - there is probably an indexing error`)

        content = await instanceToContent(topLevels, docLayout, path + "/", tag)
    }


    return {
        path: home ? "index" : path + (content ? "/index" : ""),
        layout: layout,
        params: params,
        name: name,
        content: content,
        instanceId: rmi.id,
        replaces: replaces
    }
}


// Creates a content tree according to an instance
// Involves fetching the upper level content, and go down from there
async function instanceToContent(topLevels: RmInstanceField[], layout: string, path: string, tag: string): Promise<ContentTree> {

    const l1s: ContentNode[] = await sendRequests(topLevels.map(l1 => () => toNode(l1, path, tag)))

    return {
        layout: layout,
        L1s: l1s
    }
}


// Converts a content field (RecordM side) into a content node (Vitepress side) 
// Is recursive, to convert all its children
async function toNode(field: RmInstanceField, path: string, tag: string): Promise<ContentNode> {

    if (!field.label)
        throw new Error(`cannot access $ref label for a Level field, child of ${path} - there is probably an indexing error`)

    let pathOf = path + createIdFromName(field.label)

    const children = field.allFields.filter(f => f.value())

    if (children.length > 0)
        pathOf += "/"

    const childrenNodes: ContentNode[] = await sendRequests(children.map(c => () => toNode(c, pathOf, tag)))

    return {
        path: pathOf + (children.length > 0 ? "index" : ""),
        current: await contentsOf(field.valueAsNumber()!, pathOf + (children.length > 0 ? "index" : ""), tag),
        children: childrenNodes
    }
}

// Gets the content of a page, for each locale
async function contentsOf(id: number, path: string, tag: string): Promise<Content> {

    const instance = await RmInstance.load(id)

    const common = {
        instance: instance.id,
        path: path,
        filepaths: await filesOf(id),
        restrictions: instance.field("Visibility")?.values("Audience Group") ?? [],
    }

    const textContentsOf = (inst : RmInstance)  => inst.fields("Name").map( n => {

            const localeCode = n.field("Locale")?.label 

            if (!localeCode)
                throw new Error(`cannot access $ref label for locale with id ${n.field("Locale")?.value()} in ${n.value()} - there is probably an indexing error`)    
        

            return {
                ...common, 
                title: n.value()!,
                localeCode: n.field("Locale")?.label! ,
                content: n.value("Content") ?? ""    
            }
        })


    const content : Content = {
        locales: textContentsOf(instance),
        instanceId: instance.id
    }


    if (tag) {

        const change = (await rmDefinitionSearch("Changes", `name:"${tag}"`, 0, 100)).hits.hits[0]

        if(change == undefined)
                throw new Error(`No Changes have the give tag ${tag}`)

        const individualChanges = await rmDefinitionSearch("Contents", `changes:${change._id} origin:${id}`, 0, 200)

        if (individualChanges.hits.total.value > 0) {
            const changeInstance = await RmInstance.load(individualChanges.hits.hits[0]._id)
            content.replaces = content.instanceId
            content.instanceId = changeInstance.id             


            common.filepaths = await filesOf(changeInstance.id)
            content.locales = textContentsOf(changeInstance)
                
            }
                            
    }

    return content 
}

const idOfFileField = (hit) => hit._source._definitionInfo.instanceLabel.find( f => f.name == "File" ).id

async function filesOf(id: number) : Promise<ContentFile[]> {
    const files = await rmDefinitionSearch("LRN Files", `contents:${id}`, 0, 20 )
        .then(r => r.hits.hits)
        .then(hits => hits
            .map(h => {
                if(h._source.file)
                    return { file: `/recordm/recordm/instances/${h._id}/files/${idOfFileField(h)}/${h._source.file[0]}`, kind : 'link' };
                else if(h._source.link )
                    return { file: h._source.link[0], kind: 'link' }
                else if(h._source.id_video) 
                    return { file: h._source.id_video[0], kind: 'id' }
            }))  
                
    return files 
}

function buildPathLink(field: RmInstanceField, id: number) {
    return 
}

// TODO make this depend on navbar and footer and other sitepages, so the site is built recursively and only with exactly is necessary
// Query RecordM to get the ids of all the SitePages to build
const getIds = (): Promise<number[]> =>
    rmDefinitionSearch("Site Page", 'development_status:"Published" OR (type:New AND -development_status:Inactive)', 0, 500)
        .then(resp => resp.hits.hits)
        .then(hits => hits.map(hit => hit._source.instanceId))


// Builds the sitepages of the site
export async function buildSitePages(tag: string, locData: LocaleData, homeId: number) {
    const ids = await getIds();
    const instances: RmInstance[] = await sendRequests(ids.map(id => () => RmInstance.load(id)))
    const pages: SitePage[] = await Promise.all(instances.map(rmi => instanceToPage(rmi, tag, locData, rmi.id == homeId)))
    return pages
}
