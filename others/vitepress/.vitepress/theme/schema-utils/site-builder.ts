import { rmDefinitionSearch } from "@cob/rest-api-wrapper"
import { Site, LocaleData } from '../schema/site';
import RmInstance from "../ts-cob/RmInstance";
import { buildSitePages } from "./site-pages-builder";
import { buildTemplates } from "./parameter-builder";
import { buildSidebar } from "./sidebar-builder";
import { existsSync } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';

const CACHE_NAME = "data.json"

/* -------------------------------------------------------------------------- */
// Handles all the conversion between Site Items in RecordM to local objects,
// thus making manipulation easier. Structure is maintained between the two
// different locations.
/* -------------------------------------------------------------------------- */

export async function buildSite(domain: string, tag: string, pages: boolean = true) : Promise<Site> {

    if(existsSync(CACHE_NAME)) {
        return readFile(CACHE_NAME, 'utf8').then( s => JSON.parse(s))
    }


    const siteIds = await rmDefinitionSearch("Site", `domain:${domain}`, 0, 1)
        .then(resp => resp.hits.hits)
        .then(hits => hits.map(hit => hit._source.instanceId))


    if (siteIds.length == 0) {
        throw new Error("No site with that domain")
    }

    const site = await RmInstance.load(siteIds[0])

    const labels = {}

    await rmDefinitionSearch("Locale", "*", 0, 400)
        .then( resp => resp.hits.hits)
        .then( hits => hits.forEach(hit => labels[hit._source.code[0]] = hit._source.name[0]))

    const defaultLoc = site.field("Default Locale")?.label!
    const fallbacks: { [key: string]: string } = {}
    const locales = new Set<string>([defaultLoc!])
    
    for (const f of site.fields("Locale")) {
        if(!f.value()){
            console.log("WARNING: Undefined locale")
            continue
        }
        
        const fallback = f.field("Fallback")?.label
        
        if(!fallback)
            throw new Error(`Locale ${f.label} does not have fallback `)
        
        fallbacks[f.label] = fallback
        locales.add(f.label);
        locales.add(fallback!)
    }
    
    const localeData : LocaleData = {
        locales: Array.from(locales).map( code => ({ code: code, label: labels[code]})),
        defaultLocale: { code: defaultLoc, label: labels[defaultLoc]},
        fallbacks: fallbacks,
        
    }
    
    const homeId = site.valueAsNumber("Home Page")!
    const builtPages =  pages ? await buildSitePages(tag, localeData, homeId) : []

    const sidebar = {}

    for(const loc of localeData.locales)
        sidebar[loc.code] = buildSidebar( builtPages, loc.code, loc.code == defaultLoc ? "/" : `/${loc.code}/`)

    const params = await buildTemplates(site, localeData)
        
    const siteObj = {
        sidebars: sidebar,
        navbarLayout: site.field("Navbar Layout")?.label,
        footerLayout: site.field("Footer Layout")?.label,
        homeInstance: homeId,
        parameters: params, 
        pages: builtPages,
        localeData: localeData
    }

    writeFile(CACHE_NAME, JSON.stringify(siteObj))

    return siteObj

}

export async function clearSite() {
    await unlink(CACHE_NAME).catch( _ => _)

}