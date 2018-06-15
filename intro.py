from flask import Flask
app = Flask(__name__)


@app.route("/")
def hello_world():
  return "<br>HELL!.......... O.......... World"*25

@app.route("/student/<name>/<int:roll>/<float:marks>/")
def intro(name,roll,marks):
  return "Hello My name is {} roll number {} and i got {}".format(name,roll,marks)

if __name__ == '__main__':
    app.run(host = 'localhost', port = 5151, debug = True)