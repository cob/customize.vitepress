
export const THREAD_LIMIT = 16


/**
 * Gets the url of an image in a given field in a certain response
 * @param resp A server response
 * @param field the name of the image field
 * @returns the url to the image
 */
const getImageURL = (resp, field : string, instanceId) => {
    const imf = getField(resp, [field])[0]
    const i = { n: imf.value, f: imf.fieldDefinition.id }
    return `/recordm/recordm/instances/${instanceId}/files/${i.f}/${i.n}`
}

/**
 * Returns the fields that match a given name. If more than one item is passed into `args`, 
 * it will follow it as a path. So [ 'Base Data', 'Name'] will search for a field called 'Name'
 * inside a field called 'Base Data'.
 * @param response the server response
 * @param args the field arguments
 * @returns the fields that match the given name
 */
function getField(response, args : string[]) {
    
    let current = [response]
    
    for(let arg of args) {
        current = current.flatMap( curr => curr.fields.filter(f => f.fieldDefinition.name == arg))
    }
    
    return current
    
    
} 

/**
 * Shorthand to create an ID from a name 
 * @param name the name to create an id from
 * @returns the generated id, which will be all lowercase, with no symbols, and its spaces replaced by -
 */
const createIdFromName = (name) =>
                        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');


// TODO: This is currently a hack to get the pages to render for now. Should not be necessary in the end.
// Remove HTML tags from text and fix image links to absolute
function removeHTMLTags(text) {
    if(text){
        text = text.replaceAll(/<!--[^>]*-->/g, '');
        
        
        text = text.replaceAll(/<DescriptVideo[^>]*\/>/g, '');

        // this is necessary so that the loading of images is treated as dynamic import and 
        // not static imports. It is essentially evaluating a string
        text = text.replaceAll(/src="([^"]*)"/g, ':src="\'$1\'"')

        // Remove mbedded texts (probably replace with a <img> )
        text = text.replaceAll(/!\[[^\]\[]*\]/g, '') 
        ![[]]
        return text
    }
    return ""
}

// Shorthand to get the content from a server result
const getContent = (result): string => result.fields.find(f => f.fieldDefinition.name == "Content").fields.find(f => f.fieldDefinition.name == "Name").fields[0].value


// Shorthand to get the content from a server result
const getContentLoc = (result, locale): string => result.fields.find(f => f.fieldDefinition.name == "Content").fields.find(f => f.fieldDefinition.name == locale).fields[0].value



export { getImageURL, getContent, getContentLoc,  getField, createIdFromName, removeHTMLTags }