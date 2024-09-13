import { SitePage } from '../schema/site-page';
import { Sidebar, SidebarItem } from "../schema/sidebar-structure";
import { ContentNode } from "../schema/content-tree";


// TODO make recursive
export function buildSidebar( pages: SitePage[],  localeCode : string, prefixOf : string ) {

    const sidebar : Sidebar = {}

    for(const page of pages ){
        if( !page.content ) 
            continue
        
        const topBar = {
            items: page.content.L1s
                .filter( l1 => l1.current.locales.some( p => p.localeCode == localeCode ))
                .map( l1 => ({ 
                    restrictions: l1.current.locales[0].restrictions,
                    link: prefixOf + noIndex(l1.path),
                    text: l1.current.locales.find( p => p.localeCode == localeCode )!.title, // we filtered for l1s with that have the locale, so it will never be undefined
            }))}
        
        for(const l1 of page.content.L1s){
            const s : any[] = [topBar]
            const secondBar : SidebarItem[] = []
            for(const c of l1.children ?? [])
                secondBar.push(
                        levelToSidebar(c, localeCode , prefixOf)
                    )
            s.push({ items: secondBar })
            
            sidebar[prefixOf + noIndex(l1.path)] = s
        }

        // sidebar['/'  + parentURL + '/' ] = page.content.L1s.map( l1 => levelToSidebar(l1, undefined, "") )
    
    }

    return sidebar
}

const noIndex = (path : string) => 
    path.replace("index", "")

// First sidebar of each top level points to the L1s



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