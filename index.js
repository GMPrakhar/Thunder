class Thunder{
    virtualDOM;
    variables = {};
    methods = {};
    changeableElements = [];
    changeListenersPerVariable = {};

    constructor(context, variables, methods){
        this.variables = {};
        this.registerVariables(variables);
        this.registerMethods(methods);
        this.constructVirtualDOM(context);
        this.triggerInitialValues();
        this.registerClickEvents();
    }

    registerVariables(variables){
        Object.keys(variables).forEach((variable) => {
            this.variables[variable.toLowerCase()] = variables[variable];
            this.changeListenersPerVariable[variable] = [];
            //console.log(this.variables);
            Object.defineProperty(this.variables, variable, {
                get: function(){
                    return this.variables[variable.toLowerCase()];
                }.bind(this),
                set: function(newValue){
                    this.variables[variable.toLowerCase()] = newValue;
                    this.triggerChange(variable);
                }.bind(this)
            })
        });
    }

    registerMethods(methods){
        Object.keys(methods).forEach((method)=>{
            this.methods[method] = methods[method].bind(this.variables);
            if(method == 'init'){
                methods[method].bind(this.variables)();
            }
        });
    }

    registerClickEvents(){
        const clickableElements = $(`[t-click]`);
        for(let i = 0; i < clickableElements.length; i++){
            const element = clickableElements[i];
            element.onclick = function(){eval('this.methods.'+$(element).attr('t-click'))}.bind(this);
            //console.log()
        }
    }

    constructVirtualDOM(context){
        const root = $(`[t-context=${context}`)[0];
        this.virtualDOM = {
            [root.nodeName.toLowerCase()]: {
                element: root
            }
        }

        const rootAttrs = {};
        for(let i = 0; i < root.attributes.length; i++){
            const attribute = root.attributes[i];
            rootAttrs[attribute.nodeName] = attribute.nodeValue;
        };
        this.virtualDOM[root.nodeName.toLowerCase()].attributes = rootAttrs;

        
        const rootChildren = {};
        for(let i = 0; i < root.childNodes.length; i++){
            const childNode = root.childNodes[i];
            rootChildren[childNode.nodeName.toLowerCase()] = this.recursiveChildNodes(childNode, {});
        };
        this.virtualDOM[root.nodeName.toLowerCase()].childNodes = rootChildren;
        //console.log(this.virtualDOM);
    }


    // Recursively add childNodes to the virtualDOM.

    recursiveChildNodes(root, final){

        final.element = root;
        
        if(root.nodeValue != null){
            final.textContent = root.nodeValue;
            //console.log(final.textContent);
            if(final.textContent.includes('{{')){
                this.changeableElements
                .push({type: 'inner', content: final.textContent, node: final.element});
            }
            return final;
        }

        const rootAttrs = {};
        for(let i = 0; i < root.attributes.length; i++){
            const attribute = root.attributes[i];
            rootAttrs[attribute.nodeName] = attribute.nodeValue;
            if(attribute.nodeValue.includes('{{')){
                this.changeableElements
                .push({type: 'attribute', attributeName: attribute.nodeName, node: final.element});
            }
        };
        final.attributes = rootAttrs;

        
        const rootChildren = {};
        for(let i = 0; i < root.childNodes.length; i++){
            const childNode = root.childNodes[i];
            rootChildren[childNode.nodeName.toLowerCase()] = this.recursiveChildNodes(childNode, {});
        };
        final.children = rootChildren;

        return final;
    }

    triggerInitialValues(){
        this.changeableElements.forEach((element) => {
            if(element.type == 'inner'){
                let text = element.node.nodeValue;
                let startPos = text.indexOf('{{');
                while(startPos != -1){
                    let endPos = text.indexOf('}}', startPos);
                    let variableName = text.substring(startPos+2, endPos).trim();

                    element.node.nodeValue = text.substring(0, startPos) +
                                            this.variables[variableName] +
                                            text.substring(endPos+2);
                    
                    text = element.node.nodeValue;
                    startPos = element.node.nodeValue.indexOf('{{', endPos);

                    // Add change listener so view is updated when the variable changes.
                    this.addChangeListener(variableName, function(){
                        let text = element.content;
                        element.node.nodeValue = text;
                        let startPos = text.indexOf('{{');
                        while(startPos != -1){
                            let endPos = text.indexOf('}}', startPos);
                            let variableName = text.substring(startPos+2, endPos).trim();
        
                            element.node.nodeValue = text.substring(0, startPos) +
                                                    this.variables[variableName] +
                                                    text.substring(endPos+2);
                            
                            text = element.node.nodeValue;
                            startPos = element.node.nodeValue.indexOf('{{', endPos);
                        }        
                    }.bind(this));
                }
                
            }
        });

        setTimeout(()=>{
            this.variables['Name'] = "Chotu";
        }, 2000);
    }

    triggerChange(variable){
        this.changeListenersPerVariable[variable].forEach((changeListener)=>{
            changeListener();
        });


    }

    addChangeListener(variable, callback){
        this.changeListenersPerVariable[variable].push(callback);
    }


}