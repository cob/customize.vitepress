import { rmGetInstance } from "@cob/rest-api-wrapper"
import { removeHTMLTags } from "./.vitepress/theme/schema-utils/shared"
import  fs  from "fs"
import { Locale, TemplateParameters } from "./.vitepress/theme/schema/template-parameters"
import { ContentNode, ContentTree } from "./.vitepress/theme/schema/content-tree"
import { SitePage } from "./.vitepress/theme/schema/site-page"
import { TextualContent } from "./.vitepress/theme/schema/textual-content"
import { buildSite } from "./.vitepress/theme/schema-utils/site-builder"
import { LocaleData } from "./.vitepress/theme/schema/site"

/* -------------------------------------------------------------------------- */
// Main data loader - this is a dynamic route (https://vitepress.dev/guide/routing#dynamic-routes)
// in which [path] is replaced by the path we want that page to have. It is supported by a
// Structure, which defines the site tree. Content is the only thing that needs to be fetched
// -
// This is executed on build. It currently fetches all the data sequentially and 
// the fetched pages are written to disk in the end. Parallelism is enforced as much
// as possible however
// -
// TODO: Make fetching dynamic 
/* -------------------------------------------------------------------------- */


interface PageParams {
    layout?: string,
    public?: boolean,
    instance?: number | string,

    vars?: Locale
    content?: ContentTree
    //! Be careful - cannot have a leading '/' because sidebar fails 
    path: string
}

interface Page { 
    params: PageParams,
    content?: string
}


export default {
    async paths() {

        const domain = fs.readFileSync("domain", { encoding: 'utf8'})
        const tag    = fs.readFileSync("tag", { encoding: 'utf8'})
        const site = await buildSite(domain, tag)

        const pages = site.pages
        const localePrefix = (code: string) => code == site.localeData.defaultLocale.code ? "" : `${code}/`

        const all : Page[] = pages.flatMap( p => makePages(p, site.localeData, localePrefix))

        return all
    }
}


function makePages(page: SitePage, localeData : LocaleData, prefixOf : (code: string) => string ) : Page[] {
   
    
    const mains = localeData.locales.map(
        l => ({ params: { 
                    layout: page.layout,
                    name: page.name,
                    vars: page.params?.[l.code == localeData.defaultLocale.code ? "root" : l.code],
                    path : prefixOf(l.code) + page.path,
                    children: page.content, 
                    instance: page.instanceId
                }
            })
        )
 
    if( !page.content )
        return mains
 

    const under : Page[] = page.content!.L1s.flatMap( c => flatten(c)).map( 
                c => ({ params: { 
                            files: c.filepaths,
                            name: c.title,
                            videos: c.videos,
                            vars: page.params![c.localeCode == localeData.defaultLocale.code ? "root" : c.localeCode],
                            path: prefixOf(c.localeCode) +  c.path,
                            layout: page.content!.layout,
                            restrictions: c.restrictions,
                            instance: c.instance
                        },
                        content: removeHTMLTags(c.content)
                      })) 

    
    const all = under.concat(mains)

    return all
    //    return all
    }

const flatten = (content : ContentNode) : TextualContent[] =>  [...content.current.locales].concat( content.children ? [...content.children.flatMap( c => flatten(c))] : [])

/* ------------------------------ Aux functions ----------------------------- */
