from flask import Flask, render_template


# Create a Flask application
app = Flask(__name__)

# Define a route (homepage)
@app.route('/<string:name>')
def home(name):
    students = ["Ali", "Ayesha", "Zohaib", "Sara", "Hassan", "Fatima"]
    username = name
    return render_template("index.html", students=students, course="Flask Web Development", name=name)

# @app.route('/<string:name>')
# def greet(name):
#     title = "Welcome to Python Class Task"
#     subtitle = "A modern Python web app starter. Fast, beautiful, and easy to customize."
#     python_variable = "This is a value from Python!"
#     return render_template('home.html', title=title, subtitle=subtitle, python_variable=python_variable, name=name)
@app.route("/about")
def about():
    return render_template("index.html", name="Zohaib")



@app.route("/contact")
def contact():  
    return "This is the contact page."

# Run the app
if __name__ == "__main__":
    app.run(debug=True)
