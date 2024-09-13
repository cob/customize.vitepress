export default class RmInstanceFile {

    private readonly instanceId: number
    private readonly fieldDefinitionId: number
    private readonly filename: string
  
    constructor(instanceId: number, fieldDefinitionId: number, filename: string) {
      this.instanceId = instanceId;
      this.fieldDefinitionId = fieldDefinitionId;
      this.filename = filename;
    }
  
    get name() {
      return this.filename;
    }
  
    get path() {
      return `https://learning.cultofbits.com/recordm/recordm/instances/${this.instanceId}/files/${this.fieldDefinitionId}/${this.filename}`;
    }
  }