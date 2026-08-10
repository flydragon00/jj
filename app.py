from flask import Flask # import flask module
from flask import jsonify
from flask import render_template
from flask import request
from flask import session

python app.py
app = Flask(__name__) # 초기화
app.secret_key = '123456abcd'
app.permanent_session_lifetime = timedelta(minutes=1)

@app.route("/login")
def login():
    form = request.args
    user_id = form['user_id']
    user_pw = form['user_pw']
    #user 테이블에 암호환된 비번 비교 select 코드 작성
    #로그인 성공 => 꼭 해야 하는 작업
    #세션session에 로그인 흔적 남기기
    session['user_id'] = user_id
    return f'{user_id}{user_pw}'



@app.route('/', methods=['GET'])
@app.route('/join', methods=['GET', 'POST'])
def join():
    if request.method == 'GET':
        return render_template('join.html')
    else:
        # POST 요청 시 Form 데이터 가져오기
        user_id = request.form.get('user_id')
        user_pw = request.form.get('user_pw')
        user_name = request.form.get('user_name')
        
        return f"{user_name}({user_id})님, 가입이 완료되었습니다!"

if __name__ == '__main__':
    # debug=True를 넣으면 코드를 수정할 때마다 서버가 자동 재시작됩니다.
    app.run(debug=True)

@app.route('/') # 요청 주소
def hello_world(): # 함수
    return 'Hello, World!!!!' # 응답 결과

@app.route('/template')
def template():
    return render_template('template.html')

from flask import Flask, render_template
import pymysql
from pymysql.cursors import DictCursor

app = Flask(__name__)

@app.route('/customers')
def customers():
    conn = pymysql.connect(
        host='svc.sel3.cloudtype.app', 
        user='root',
        password='1234',
        db='ggoreb', 
        charset='utf8', 
        port=31776
    )
    try:
        with conn.cursor(DictCursor) as cursor:
            sql = "SELECT * FROM 고객"
            cursor.execute(sql)
            result = cursor.fetchall()
    finally:
        conn.close()

    return render_template('customers.html', data=result)

if __name__ == '__main__':
    app.run(debug=True)


@app.route('/assembly') # 요청 주소
def assembly(): # 함수
    # return 'Fuck YOU!!!!!' # 응답 결과
    import pymysql
    from pymysql.cursors import DictCursor

    conn = pymysql.connect(
    host='svc.sel3.cloudtype.app', user='root', password='1234',
    db='DEATH NOTE', charset='utf8' ,port = 31776
    )
    cursor = conn.cursor(DictCursor)
    sql = '''
        select * from assembly_member
        limit 0,10
    '''
    cursor.execute(sql)
    result = cursor.fetchall()
    print(result)
    result2 = jsonify(result)
    # for row in result:
    #     print(row[0], row[1], row[2], row[3])

    cursor.close()
    conn.close()
    return result2
if __name__ == '__main__':
    app.run(host='0.0.0.0', port =80, debug =True) # flask 실행


@app.route('/test1')
def test1():
    return render_template('template.html', score=100)

@app.route('/test2', methods=[ 'GET', 'POST' ])
def test2():
    return [1,2,3]

@app.route('/test3/<tid>')
def test3(tid):
    return 'tid is %s' % tid

@app.route('/test4')
@app.route('/test4/<int:tid>')
def test4(tid=None):
    return 'test4 tid is %s' % tid
