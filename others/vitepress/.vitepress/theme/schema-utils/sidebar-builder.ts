import { SitePage } from '../schema/site-page';
import { Sidebar, SidebarItem } from "../schema/sidebar-structure";
import { ContentNode } from "../schema/content-tree";


// TODO make recursive
export function buildSidebar( pages: SitePage[],  localeCode : string, prefixOf : string ) {

    const sidebar : Sidebar = {}

    for(const page of pages ) {
        if(!page.content)
            continue
        
        const top =prefixOf + noIndex(page.path)      
        sidebar[top] = []  
        const localeL1s = page.content.L1s.filter( l1 => l1.current.locales.some( p => p.localeCode == localeCode )) 


        for(const l1 of localeL1s) {
            sidebar[top].push(
                {
                    text: l1.current.locales.find( p => p.localeCode == localeCode )!.title,
                    link: prefixOf + noIndex(l1.path), restrictions: [], items: l1.children?.map( c => levelToSidebar(c, localeCode, prefixOf) )})
        }
            
    }

    return sidebar
}

const noIndex = (path : string) => 
    path.replace("index", "")

// TODO check where undefined = root
function levelToSidebar( level : ContentNode, locale: string | undefined, prefixOf : string) : SidebarItem {

    const title = level.current.locales.find( l => l.localeCode == locale )?.title
    if(!title)
        console.log(`WARNING: level ${level.path} does not have title for locale ${locale}`)

    return { 
        restrictions: level.current.locales[0].restrictions ?? [],
        link: noIndex(prefixOf + level.path),
        text: title,
        items: level.children?.map( l => levelToSidebar(l, locale, prefixOf)),
            collapsed: level.children ? level.children.length > 0 ? true : undefined : undefined
    }
}