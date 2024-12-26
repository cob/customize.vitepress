
if(msg.definitionName == "Contents" && msg.value("Development Status") == "In Development") {
    def changesInstance = msg.value("Changes", Integer) as Integer
    if(changesInstance)
        recordm.update("Changes", changesInstance, ["Estado Deploy" : "", "Estado Index" : ""])
}

if(msg.definitionName == "Contents" && msg.action == "add" && msg.value("Development Status") == "In Development") {

    def originId = msg.value("Origin")
    if(originId != null) {
        def origin = recordm.get(originId).body

        def names = origin.values("Name")
        def locs = origin.values("Locale")
        def text = origin.values("Content")
        def tags = origin.values("Tags")
        def visi = origin.values("Visibility")
        def accessGrs = origin.values("Audience Group")

        recordm.update("LRN Files", "contents:$origin.id", ["Contents[+]" : msg.id])

        recordm.update("Contents", msg.id, [
                "Name" : names, "Locale" : locs, "Content" : text, "Tags" : tags,
                "Visibility" : visi, "Audience Group" : accessGrs
        ])
    }
}
