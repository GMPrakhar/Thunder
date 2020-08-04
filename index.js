class Thunder{
    virtualDOM;
    context;
    changeableElements = [];
    changeListenersPerVariable = {};

    constructor(context, variables, methods){
        this.variables = {};
        this.context = new Context();
        this.registerVariables(variables);
        this.registerMethods(methods);
        this.constructVirtualDOM(context);
        this.triggerInitialValues();
        this.registerClickEvents();
        this.registerEventListeners();

        window.listeners = this.changeListenersPerVariable;
    }

    /**
     * Registers the user defined variables with the context.
     * @param variables The object that contains all the context variables to be registered.  
     */
    registerVariables(variables){
        this.context.variables = Object.keys(variables);

        Object.keys(variables).forEach((variable) => {

            // Creating an inner property for current context and populating initial value.
            this.context['_' + variable] = variables[variable];

            // Defining getters and setters for the above created property
            // That can be used for change detection.
            Object.defineProperty(this.context, variable, {
                get: function(){
                    return this['_'+variable];
                },
                set: function(newValue){
                    this['_'+variable] = newValue;

                    // Emit a new 'Variable Changed' event 
                    let event = new CustomEvent("variableChanged", {detail : {[variable]: newValue}});
                    document.dispatchEvent(event);
                }
            })
        });


        // ------------------ Debug code to check if context changes are working or not -------------
        // window.context = this.context;
        // console.log(this.context);
    }

    /**
     * Registered user defined methods with the context.
     * @param methods The object that contains all the functions 
     */
    registerMethods(methods){

        Object.keys(methods).forEach((method) => {
            this.context[method] = methods[method];

            // Automatically call the special method init.
            if(method == 'init'){
                methods[method].bind(this.context)();
            }
        })
    }

    /**
     * Registers click events for elements with 't-click' attribute.
     */
    registerClickEvents(){
        // ---- TODO ----
        // Currently click events won't work if variables or methods are used inside the function itself.
        // Solution : Change it with the logic used in triggerInitialValues

        let clickableElements = $('[t-click]');

        for(let i = 0; i < clickableElements.length; i++){
            const element = clickableElements[i];

            // Call the specified function, setting the 'this' as context.
            element.onclick = this.evaluateTaser('this.context.' + $(element).attr('t-click'));
        }
    }

    /**
     * Constructs a virtual DOM copy of given context.
     * Adds additional content and type to the elements for change detection use.
     * @param context The context for which the virtual DOM is created. 
     */
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


    /**
     * Recursively add childNodes to the virtualDOM.
     * @param root Root for the recursive call. 
     * @param final final element that is returned. 
     */

    recursiveChildNodes(root, final){

        final.element = root;
        
        if(root.nodeValue != null){
            final.textContent = root.nodeValue;

            if(final.textContent.includes('{{') && final.textContent.includes('}}')){
                this.changeableElements
                .push({type: 'inner', content: final.textContent, node: final.element});
            }
            return final;
        }

        const rootAttrs = {};
        for(let i = 0; i < root.attributes.length; i++){
            const attribute = root.attributes[i];
            rootAttrs[attribute.nodeName] = attribute.nodeValue;
            if(attribute.nodeValue.includes('{{') && attribute.nodeValue.includes('}}')){
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

    /**
     * Run a change detection for initial values. 
     * Also adds change detection functionality for used variables.
     */
    triggerInitialValues(){

        this.changeableElements.forEach((element) => {
            if(element.type == 'inner'){
                let finalElementValue = "";
                let finalElementContent = "";
                let text = element.node.nodeValue;
                let startPos = text.indexOf('{{');
                let endPos = -1;
                finalElementValue += text.substring(0, startPos);
                finalElementContent += text.substring(0, startPos);
                while(startPos != -1){
                    if(endPos != -1){
                        finalElementValue += text.substring(endPos+2, startPos);
                        finalElementContent += text.substring(endPos+2, startPos);
                    }

                    endPos = text.indexOf('}}', startPos);
                    let evaluatableExpression = text.substring(startPos + 2, endPos);

                    for(let variable of this.context.variables){
                        if(evaluatableExpression.indexOf(variable) == -1) continue;

                        // Replace the variable name so that it uses the Thunder context.
                        let re = new RegExp(variable, "g");
                        evaluatableExpression = evaluatableExpression.replace(re, `this.context.${variable}`);

                        this.addChangeListener(variable, this.detectChanges.bind(this, [element]));
                    }

                    // Evaluate the inner Taser expression and update the value.
                    finalElementValue += this.evaluateTaser(evaluatableExpression)();

                    finalElementContent += "{{" + evaluatableExpression + "}}";
                    
                    startPos = text.indexOf('{{', endPos+2);
                }

                element.node.nodeValue = finalElementValue;
                element.content = finalElementContent;
            }
        })
    }

    /**
     * Registers event listeners with the Thunder context.
     */
    registerEventListeners(){
        
        document.addEventListener('variableChanged', (event) => {
            let variable = Object.keys(event.detail)[0];
            this.changeListenersPerVariable[variable].forEach((changeListener)=>{
                changeListener();
            });
        });

    }

    /**
     * Adds the functionality needed to be triggered when the context variable changes.
     * @param variable The variable for which change detection is to be added. 
     * @param callback The function to call when change detection event fires. 
     */
    addChangeListener(variable, callback){
        if(this.changeListenersPerVariable[variable] == undefined){
            this.changeListenersPerVariable[variable] = [];
        }

        this.changeListenersPerVariable[variable].push(callback);
    }

    /**
     * Returns a function that can be called to evaluate specified expression
     * @param {The expression to evaluate} evalExpression 
     */
    evaluateTaser(evalExpression){
        return function(){return eval(evalExpression);}.bind(this);
    }


    /**
     * Updates the element which underwent change.
     * @param args Contains a single object as the element for which change detection is to be done. 
     */
    detectChanges(args){
        let element = args[0];
        let finalElementValue = "";
        let text = element.content;
        let startPos = text.indexOf('{{');
        let endPos = -1;
        finalElementValue += text.substring(0, startPos);
        while(startPos != -1){
            if(endPos != -1){
                finalElementValue += text.substring(endPos+2, startPos);
            }

            endPos = text.indexOf('}}', startPos);
            let evaluatableExpression = text.substring(startPos + 2, endPos);

            finalElementValue += this.evaluateTaser(evaluatableExpression)();
            
            startPos = text.indexOf('{{', endPos+2);
        }

        element.node.nodeValue = finalElementValue;
    }


}

class Context{

}