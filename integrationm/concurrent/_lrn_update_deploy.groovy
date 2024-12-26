// Callback chamado pelo gitlab para ir actualizando o estado
// do deploy/stage

def tag = argsMap.tag
def state = argsMap.state

def indexOf(state) {
    switch (state) {
        case "Preparing Build environment": return 0
        case "Installing dependencies": return 1
        case "Building...": return 2
        case "Preparing Deploy environment": return 3
        case "Deploying..": return 4
        case "Deployed": return 5
        default: throw new Exception("Not an accepted state")
    }
}

def index = indexOf(state)
recordm.update("Changes", "name:\"$tag\"", [
        "Estado Deploy" : state,
        "Estado Index" : index,
        "Deploy Progress" : index*20
])