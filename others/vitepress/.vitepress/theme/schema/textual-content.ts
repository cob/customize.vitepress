export interface TextualContent {
    filepaths: ContentFile[],
    instance: number,
    path: string,
    localeCode: string
    title: string
    content: string
    restrictions: string[]
}


export interface ContentFile {
    kind: 'link' | 'id',
    file: string 
}