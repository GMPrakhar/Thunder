# Thunder
Thunder is a javascript framework for lightning fast rendering, and element based change detection.

## How to run
- Clone the repo and go into the project directory.
- run `npm install` and you are good to go.
- Change index.html however you like!
- To run the example index.html, just use `npm start`

## Documentation
This project is still in the infant phase, hence the framework code resides completely in the `index.js` file.

#### Initialization
You can start using Thunder by first including the `index.js` file in your document head. Then you need to create a new Thunder class.

```javascript
<script>
new Thunder(
  contextName: The context in which this thunder class will work.,
  variables: An object that has keys as the variable names and values as their default value,
  methods: An object that has keys as the method name and value as a function.
  )
</script>
```

#### Directives
- `t-context` : Specifies the context of the Thunder app. All the variables and methods are valid for this context only.
- `t-click` : Specifies the method that is called when an element is clicked.

#### Example
You can find an example file `index.html` in the repo folder. A simpler example is given below.

```javascript
<html>
    <head>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
        <script src="index.js"></script>
        <title>Thunder</title>
    </head>
    <body>
        <div t-context="myApp">
          <p t-click="changeName('NewName')">Hello {{Name}}!</p>
        </div>
    </body>
    <script>
      new Thunder("myApp", {
          Name: "Kowalski"
        }, {
          // init function is a special function that is automatically called upon page load.
          init: function(){},
          changeName: function(newName){
              this.Name = newName;
            }
        });
    </script>
</html>

```
