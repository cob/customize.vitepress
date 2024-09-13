import { Sidebar } from "./sidebar-structure"
import { SitePage } from "./site-page"
import { TemplateParameters } from "./template-parameters"

export interface Site {
    sidebars: {[key: string] : Sidebar}
    pages: SitePage[],
    localeData: LocaleData,
    homeInstance: number,
    navbarLayout?: string,
    footerLayout?: string,
    parameters: TemplateParameters
}

export interface LocaleData {
    fallbacks: {[key : string] : string}
    locales: SiteLocale[]
    defaultLocale: SiteLocale
}

export interface SiteLocale  { code : string, label : string}
