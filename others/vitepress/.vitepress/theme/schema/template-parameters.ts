
export interface TemplateParameters {
    [key: string] : Locale 
}

export interface Locale {
    [ key : string] : TemplateGroup[]
}

export interface TemplateGroup {
    [key : string] : string[]
}