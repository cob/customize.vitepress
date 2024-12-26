

if(msg.definitionName == "LRN Files") {
    def baseDir = "/var/lib/recordm/attachments/${msg.instance.field('File').getFilePath()}";
    def filepath = "$baseDir/${msg.value("File")}"
    def targetFilepath = "${filepath}.png"
    resizeImage(filepath, targetFilepath, "512x384>")

    def targetName = "${msg.value("File")}.png"
    def ff = new File(targetFilepath)
    recordm.attach(msg.id, "Reduced File", targetName , ff )
    recordm.update("LRN Files", msg.id, ["Reduced File" : targetName])
}



def resizeImage(String filepath, String target, String dimensionExpression) {
    def resultado = new StringBuilder();
    def error = new StringBuilder();

    def comando = ["/usr/bin/convert", filepath,
                   "-quiet",
                   "-resize", dimensionExpression,
                   "-unsharp", "0x1",
                   target].execute();
    comando.consumeProcessOutput(resultado, error);
    comando.waitForOrKill(3000);

    if (!error.toString().equals("")) {
        log.error("Error when resizing, aborting! {{error: ${error}")
        return;
    }
}