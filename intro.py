from flask import Flask,request,redirect,url_for,render_template
app = Flask(__name__)


@app.route("/")
def hello_world():
    return render_template("index.html")

@app.route("/student/<name>/<int:roll>/<float:marks>/")
def intro(name = 'z',roll=0,marks=1.1):
  return "Hello My name is {} roll number {} and i got {}".format(name,roll,marks)

@app.route("/result",methods =['POST','GET'])
def results():
    result = request.form
    return render_template('result.html', result=result)

@app.route("/login",methods =['POST','GET'])
def login():
    if request.method == 'POST':
        name = request.form['name']
        roll = request.form['roll']
        marks = request.form['marks']
        return redirect(url_for('intro', name=name,roll=roll,marks = marks ))
    else:
        return "You Called using {}".format(request.method)


if __name__ == '__main__':
    app.run(host = 'localhost', port = 5151, debug = True)