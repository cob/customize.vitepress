import { ContentTree } from "./content-tree"
import { TemplateParameters } from "./template-parameters"

export interface SitePage {
    path: string
    name: string
    layout: string
    params?: TemplateParameters
    content?: ContentTree
    instanceId: number
    replaces?: number
}