/* 
    추가할 것
    1. 현재는 유일한 키값을 시간-인덱스 로 구분하지만 해쉬로 언젠가는 바꿔야함.

    배열 기본 형식
    menu.push({ name: "치킨데리야끼", state: 0, price: 4500 });
    have.push({ name: "치킨데리야끼", key: "19.11.11.15:35:24^1"}); 날짜. 시간. 동시에 같은음식의 식권을 구매했을시에 매기는 인덱스
*/
const MAX_CHOICE = 9;                               // 각 식권 최대 구매가능 갯수
var ID, Name;                                       // 학번
var scan_popup = false;                             // 스캐너 팝업 상태
var float_btn = false;                              // 플로팅 버튼 상태
var float_btn2 = null;                              // setInterval 플로팅 버튼 체크
var res = new Array();                              // 선물할 학생 정보
var menu = Array(3).fill(null).map(() => Array());  // 장바구니
var have = Array(3).fill(null).map(() => Array());  // 식권
var hist = new Array();                             // 구매 기록
var cur_table = null;                               // 현재 사용자가 보고있는 테이블
var pre;                                            // 선물할 식권 (저장용)
var scanner = null;                                 // qr_scanner 변수
var qr_repeat = null;                               // qr코드 setInterval 저장 변수
var isDim, $el = null;                              // qr코드 팝업창을 감지하기 위한 변수
var qrcode = null;
var cam_exist = true;                              // 기기에 카메라가 있는지 감지하는 변수
var session_time = null;

$(function () { // 식당별 음식 메뉴 출력, 식권 보관함 출력
    ID = document.getElementById('_ID').innerHTML;
    if (ID.length > 7) {
        var tmp = ID.split('>')[1];
        ID = tmp.substr(0, tmp.length - 3);
    }
    Name = document.getElementById('_NAME').innerHTML;
    session_time = document.getElementById('_TIME').innerHTML;
    //alert(session_time);

    $.ajax({
        url: "getData.php",
        type: 'post',
        data: { ID: ID },
        dataType: "text",
        success: function (result) {
            var obj = JSON.parse(result);
            for (var i = 0; i < obj.mList0.length; i++)
                menu[0].push({ name: obj.mList0[i].name, state: 0, price: obj.mList0[i].price });

            for (i = 0; i < obj.mList1.length; i++)
                menu[1].push({ name: obj.mList1[i].name, state: 0, price: obj.mList1[i].price });

            for (i = 0; i < obj.mList2.length; i++)
                menu[2].push({ name: obj.mList2[i].name, state: 0, price: obj.mList2[i].price });

            for (i = 0; i < obj.tList0.length; i++)
                have[0].push({ name: obj.tList0[i].name, key: obj.tList0[i].time });

            for (i = 0; i < obj.tList1.length; i++)
                have[1].push({ name: obj.tList1[i].name, key: obj.tList1[i].time });

            for (i = 0; i < obj.tList2.length; i++)
                have[2].push({ name: obj.tList2[i].name, key: obj.tList2[i].time });

            for (i = 0; i < obj.hList.length; i++)
                hist.push({ name: obj.hList[i].name, key: obj.hList[i].time, table: obj.hList[i].table });

            for (i = 0; i < 3; i++) {
                var target = "menu_table_" + i;
                var html = "";
                for (var j = 0; j < menu[i].length; j++) {
                    html += "<table><tr><td>";
                    html += "<button type='button' onclick='print_list(" + j + "," + i + ");'>";
                    html += "<img src='images/" + menu[i][j].name + ".jpg' onerror='this.src=\"images/no_img.jpg\"'/>";
                    html += "<h4>" + font_size(menu[i][j].name) + menu[i][j].price + "</h4>";
                    html += "</button></td></tr></table>";
                }
                hist.sort(function (a, b) { return a.key > b.key ? -1 : a.key < b.key ? 1 : 0; });
                document.getElementById(target).innerHTML = html;
            }

            html = "";
            for (i = 0; i < 3; i++) {
                switch (i) {
                    case 0: html += "<h3 class='major'>중앙도서관</h3>"; break;
                    case 1: html += "<h3 class='major'>학생회관</h3>"; break;
                    case 2: html += "<h3 class='major'>교수회관</h3>"; break;
                }
                for (j = 0; j < have[i].length; j++) {
                    html += "<table><tr><td>";
                    html += "<button type='button' onclick='btn_exam(" + i + "," + j + ")' class='btn-example'>";
                    html += "<img src='images/" + have[i][j].name + ".jpg' onerror='this.src=\"images/no_img.jpg\"'/>";
                    html += "<h4>" + font_size(have[i][j].name) + "</h4>"; // 여기 잘안될 가능성있음 안되면 true추가
                    html += "</button></td></tr></table>";
                }
            }

            html += "<br><button type = 'button' onclick = 'histclick();'><h3 class='major'>식권 구매내역 보기</h3></button>";
            html += "<div class='history'>";

            for (i = 0; i < hist.length; i++) {
                var str = hist[i].key.split('^')[0];
                html += "<div class='btn_list' style='vertical-align: middle; margin-bottom:3px;'>";
                html += "<div class='nameTag' style='float:left; margin:0.5rem; width:52%; height:24px;'>" + getType(hist[i].table) + font_size(hist[i].name, 2) + "</div>";
                html += "<div style='float:right;margin:0.5rem; width:115px;text-align:right;'>" + str.substring(2, str.length) + "</div>";
                html += "</div>";
            }
            html += "</div>";

            html += "<div class='dim-layer'><div class='dimBg'></div><div id='layer2' class='pop-layer'>";
            html += "<div class='pop-container'><div class='pop-conts' style='text-align:center;'>";
            //content
            html += "<p class='ctxt mb20'><div id='fd_name' style='color:black;'></div><div id='qrcode'></div></p>";
            html += "<div class='btn-r'><button onclick='scanner_popup()' id='btn-layerPresent'>선물하기</button>";
            html += "<button onclick='keyboard_popup()' id='btn-layerKeyboard'>직접입력</button>"; // *****************************************
            html += "<a href='#' class='btn-layerClose'>Close</a></div>";
            html += "</div></div></div></div>";
            document.getElementById("qr_list").innerHTML = html;
        }
    });
    // bvvvvv $('.nameTag').css('width', );
    //alert("win.wh -> " + window.innerWidth);
    //console.log("win.wh -> " + window.innerWidth);
    /*
     * 최대 글자 허용 수치 (메뉴 버튼, 장바구니)
     galaxy s8 width : 412 (9, 10)
     iphone 11 width : 414 (9, 10)
     iphone 6s width : 375 (8, 7)
     */
});

function font_size(str, type = 0) { // 글자수 12초과시 폰트 작게
    var len1, len2;
    if (window.innerWidth < 355)
        len1 = 8, len2 = 5;
    else if (window.innerWidth < 380)
        len1 = 8, len2 = 6;
    else if (window.innerWidth < 395)
        len1 = 8, len2 = 7;
    else if (window.innerWidth < 410)
        len1 = 8, len2 = 8;
    else if (window.innerWidth < 425)
        len1 = 9, len2 = 9;
    else if (window.innerWidth < 440)
        len1 = 9, len2 = 10;
    else if (window.innerWidth < 460)
        len1 = 9, len2 = 11;
    else if (window.innerWidth < 480)
        len1 = 10, len2 = 12;
    else
        len1 = 10, len2 = 100;

    if (type == 0) { // 메뉴
        if (str.length > len1) return str.substring(0, len1) + "<br>" + str.substring(len1, str.length) + "&nbsp;";
        else return str + "<br>";
    }
    else if (type == 1) { // 장바구니
        if (str.length > len2) return str.substring(0, len2) + "..";
        else return str;
    }
    else { // 식권 구매내역
        if (str.length > len2) return str.substring(0, len2) + "..";
        else return str;
    }
    
}

$.expr.filters.offscreen = function (el) { // $("#" + target).is(':offscreen')
    var rect = el.getBoundingClientRect();
    return (
        (rect.x + rect.width) < 0
        || (rect.y + rect.height) < 0
        || (rect.x > window.innerWidth || rect.y > window.innerHeight)
    );
};

$('.float').click(function(event) { // 플로팅 버튼 클릭시 레이어가 닫히지 않게 하는 함수
    float_btn = true;
    event.preventDefault();
    $('.float').fadeOut(650);
    if (float_btn2 != null) {
        clearInterval(float_btn2);
        float_btn2 = null;
    }

    //var varUA = navigator.userAgent.toLowerCase();

    var offset = $("#menu_list_" + cur_table).offset();
    //if (!(varUA.indexOf("iphone") > -1 || varUA.indexOf("ipad") > -1 || varUA.indexOf("ipod") > -1))
        $('html, body').animate({ scrollTop: offset.top }, 1000);
    //else
    //    $('html, body').animate({ scrollTop: offset.top }, 0);

    setTimeout(function () { float_btn = false; }, 500);
});

$(document).mouseup(function (e) { // qr 팝업 바깥쪽 클릭시 닫히는 함수
    if ($el != null && $("#layer2").has(e.target).length == 0) {
        init_popup();
        isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
        $el = null;
    }
});

function print_list(idx, table_num, flag = true, refresh = true) { // 장바구니 리스트 출력 함수
    cur_table = table_num;
    var target = "menu_list_" + String(table_num);
    var html = "";
    var sum = 0;
    if (refresh) { // false가 들어오면 테이블만 새로고침한다
        if (table_num == 2 && flag && menu[table_num][idx].state < 30) menu[table_num][idx].state++;
        else if (flag && menu[table_num][idx].state < MAX_CHOICE) menu[table_num][idx].state++;
        else if (!flag) menu[table_num][idx].state = 0;
        else if (table_num == 2 && flag && menu[table_num][idx].state == 30)
            alert("더이상 추가할 수 없습니다.");
        else if (flag && menu[table_num][idx].state == MAX_CHOICE)
            alert("더이상 추가할 수 없습니다.");
    }

    for (var i = 0; i < menu[table_num].length; i++)
        if (menu[table_num][i].state >= 1) { // css로 우겨넣자..
            html += "<div class='btn_list' style='vertical-align: middle;'>";
            html += "<div class='btn_rmv' style='float:left; height:38px;'>";
            html += "<button type = 'button' onclick = 'print_list(" + i + "," + table_num + "," + false + ")' style='float:left'>";
            html += "<span class='icon fa-remove' style='margin-left:0.5rem'/></button>";
            html += "<div class='btn_rmv' style='float:left;letter-spacing:1px;margin:0.5rem; height:24px;'>" + font_size(menu[table_num][i].name, 1) + "</div></div>";

            html += "<div style='float:right; height:38px;'>";
            html += "<div class='btn_rmv' style='float:right;letter-spacing:1px;margin:0.5rem'>";
            html += comma(menu[table_num][i].price * menu[table_num][i].state); // 여기에 갯수추가
            html += "원&nbsp;&nbsp;</div>";

            html += "<button type = 'button' style='float:left;'onclick = 'menu_cnt(" + i + "," + true + "," + table_num + ")'>";
            html += "<span class='icon fa-arrow-up'/></button>";
            html += "<div class='btn_rmv' style='float:left;letter-spacing:1px;margin:0.5rem'>" + menu[table_num][i].state + "</div>";
            html += "<button type = 'button' style='float:left;'onclick = 'menu_cnt(" + i + "," + false + "," + table_num + ")'>";
            html += "<span class='icon fa-arrow-down'/></button></div></div>";
            sum += menu[table_num][i].price * menu[table_num][i].state;
        }
    if (sum >= 1000) { // 여기에 총 가격 표시
        html += "<hr style='margin:1.5rem 0 1rem 0;'>";
        html += "<div style='float:left'><h2 style='letter-spacing:1px;'>총 금액</h2></div>";
        html += "<div style='float:right;'><h2 style='letter-spacing:2px;'>";
        html += comma(sum) + "원</h2></div>";
        $(".btn_set button").css("background", "#f62e3d"); // 구매버튼 빨간색 활성화
        if ($("#" + target).is(':offscreen')) {
            $('.float').fadeIn(650); // 플로팅 아이콘
            if (float_btn2 == null)
                float_btn2 = setInterval(function () { // 장바구니가 화면에 뜨면 플로팅 아이콘이 사라지는 함수
                    if (!$("#" + target).is(':offscreen')) {
                        $('.float').fadeOut(650);
                        clearInterval(float_btn2);
                        float_btn2 = null;
                    }
                }, 300);
        }
    }
    else {
        $(".btn_set button").css("background", "#333333"); // 구매버튼 회색 비활성화
        $('.float').fadeOut(650); // 플로팅 아이콘
        if (float_btn2 != null) {
            clearInterval(float_btn2);
            float_btn2 = null;
        }
    }

    document.getElementById(target).innerHTML = html;
}

function my_qrcode() { // 내 학번 QR코드 창
    $('#btn-layerPresent').fadeOut(0); // 선물하기 버튼 비활성화
    $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
    init_popup();
    document.getElementById("fd_name").innerHTML = "<h3 style='color:black;'>" + ID + " " + Name + "</h3>";
    document.getElementById("qrcode").innerHTML = "";

    qrcode = null;
    qrcode = new QRCode(document.getElementById("qrcode"), {
        text: ID + "-" + Name,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    $("#qrcode > img").css({ "margin": "auto" });
    $("#qrcode").css("color", "black");
    layer_popup("#layer2");
}

function btn_exam(i, j) { // 식권 클릭시 처리하는 함수
    $('#btn-layerPresent').fadeIn(0); // 선물하기 버튼 활성화
    $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
    pre = {
        name: have[i][j].name,
        key: have[i][j].key,
        table: i
    };
    var popup_cnt = 0;
    var qr_txt = ID + "-" + have[i][j].name + "-" + have[i][j].key + "-" + i + "-" + rand();

    document.getElementById("fd_name").innerHTML = have[i][j].name;
    document.getElementById("qrcode").innerHTML = "";
    qrcode = null;
    qrcode = new QRCode(document.getElementById("qrcode"), {
        text: qr_txt,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    $("#qrcode > img").css({ "margin": "auto" });
    layer_popup("#layer2");
    //////////// 반복 /////////////

    qr_repeat = setInterval(function () {
        var qr_txt = ID + "-" + have[i][j].name + "-" + have[i][j].key + "-" + i + "-" + rand();

        document.getElementById("fd_name").innerHTML = have[i][j].name;
        document.getElementById("qrcode").innerHTML = "";
        qrcode = null;
        qrcode = new QRCode(document.getElementById("qrcode"), {
            text: qr_txt,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        $("#qrcode > img").css({ "margin": "auto" });

        //      실험적인 기능         // 시스템 자원을 부하시킬 가능성 많음. QR인식시 자동닫기
        var temp = { id: ID, name: have[i][j].name, value: have[i][j].key, table: i };
        $.ajax({ 
            url: "use_check.php",
            method: "post",
            dataType: "text",
            data: { temp: JSON.stringify(temp) },
            success: function (res) {
                if (res == "true") { // select시 쿼리결과가 0이면 삭제가 완료된것이므로
                    clearInterval(qr_repeat);
                    qr_repeat = null;
                    isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
                    window.location.reload(true);
                }
            }
        });
        if (popup_cnt++ >= 40) { // qr 팝업창이 1분이상 지속되었을경우 서버 수신 종료
            clearInterval(qr_repeat);
            qr_repeat = null;
        }
    }, 1500);
}

function keyboard_popup() { // 직접입력 버튼 클릭시
    res[0] = res[1] = "";
    present_popup();
    scanner.stop();
    setTimeout(function () {
        scanner.stop();
        scanner = null;
    }, 2500);
    $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
    //layer_popup("#layer2");
};

function scanner_popup() { // 선물하기 버튼 누를시 실행
    if (!scan_popup) { // qr스캔 전
        $('#btn-layerPresent').fadeOut(0); // 선물하기 버튼 비활성화
        $('#btn-layerKeyboard').fadeIn(0); // 직접입력 버튼 활성화
        init_popup();
        document.getElementById("fd_name").innerHTML = "학생증 스캔";
        document.getElementById("qrcode").innerHTML = "<video id='preview'></video>";


        cam_exist = true;
        scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
        Instascan.Camera.getCameras().then(cameras => {
            scanner.camera = cameras[cameras.length - 1];
            scanner.start();
        }).catch(e => (keyboard_popup(), cam_exist = false));

        if (cam_exist) {
            cam_exist = true;
            scanner.addListener('scan', content => { // 스캔시 출력되는 내용
                // 식권 창을 띄운상태에서 사용후 선물하기를 누르면 계속 진행될수도 있음(버그)
                res = content.split('-');
                if (res[2] == null) { // 스캔 성공시임
                    present_popup();
                    scanner.stop();
                    scanner = null;
                    $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
                }
                else
                    alert("유효하지 않은 학생증 입니다.");
            });
            $("#qrcode > img").css({ "margin": "auto" });
            $("#qrcode").css("color", "black");
            /*
            layer_popup("#layer2");
            */
        }
    }
    else { // 스캔완료후
        $('#btn-layerPresent').fadeIn(0); // 선물하기 버튼 활성화
        $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
        scan_popup = false;
        var pww = $('#pass').val()
        res[0] = $('#idd').val();
        res[1] = $('#namee').val();

        if (ID == res[0]) {
            alert("본인에게 선물은 안됩니다.");
            init_popup();
            isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
            return;
        }
        
        if (res[0] == "" || res[1] == "") // ID 이름 미입력시
            alert("받는사람의 정보를 입력해주세요."), scan_popup = true;
        else if (pww == "") // 비밀번호 미입력시
            alert("비밀번호를 입력해주세요."), scan_popup = true;
        else if (confirm(pre.name + "을 선물하시겠습니까?")) {
            var _key = {
                cur_id: ID,
                cur_pw: pww,
                name: pre.name,
                time: pre.key,
                pre_id: res[0],
                pre_name: res[1],
                new_time: pre.key + "^p",
                table: pre.table
            };
            pww = null;
            $.ajax({
                url: "present.php",
                method: "post",
                data: { _key: JSON.stringify(_key) },
                dataType: "text",
                success: function (result) {
                    if (result == "true")
                        alert(res[1] + "님에게 선물완료!");
                    else if (result == "false")
                        alert("유효하지 않은 식권입니다!");
                    else if (result == "false_id")
                        alert("받는사람의 정보가 유효하지 않습니다!");
                    else if (result == "false_pw")
                        alert("비밀번호가 올바르지 않습니다!");
                    else
                        alert("error" + result);
                }
            });
            setTimeout(function () { window.location.reload(true); }, 800);
        }
        else { // 선물하기 취소시
            init_popup();
            isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
            return;
        }
    }
}

function present_popup() { // QR코드 스캔 성공시
    $('#btn-layerPresent').fadeIn(0); // 선물하기 버튼 활성화
    $('#btn-layerKeyboard').fadeOut(0); // 직접입력 버튼 비활성화
    qrcode = null;
    scan_popup = true;
    var html = "";
    document.getElementById("fd_name").innerHTML = pre.name;

    html += "<input type = 'text' id = 'idd' name = 'idd' placeholder = '받는사람 학번' autocomplete='off' style='margin: 0 0 0.5rem 2.25rem;' />";
    html += "<input type = 'text' id = 'namee' name = 'namee' placeholder = '받는사람 이름' autocomplete='off' style='margin: 0 0 0.5rem 2.25rem;' />";
    html += "<input type = 'text' name = 'fake' style='display: block; width: 0px; height: 0px; border: 0;'/>";
    html += "<input type = 'password' name = 'fakee' style='display: block; width: 0px; height: 0px; border: 0;'/>";
    html += "<input type = 'password' id = 'pass' name = 'pww' placeholder = '내 비밀번호' autocomplete='off' style='margin: 0 0 0.5rem 2.25rem;' />";

    document.getElementById("qrcode").innerHTML = html;
    $('#idd').val(res[0]);
    $("#namee").val(res[1]);
}

function layer_popup(el) { // 팝업창 함수
    $el = $(el);
    isDim = $el.prev().hasClass('dimBg'); //dimmed 레이어를 감지하기 위한 boolean 변수
    // WQHD+ ($("#tic").height(), 식권 줄 갯수)-> (807, 3), (625, 2), (443, 1)

    isDim ? $('.dim-layer').fadeIn() : $el.fadeIn();

    // 화면의 중앙에 레이어를 띄운다.
        //$el.css("position", "absolute");
    if ($("#tic").height() > 650)
        $el.css("top", Math.max(0, (($(window).height() - $el.outerHeight()) / 2) + $(window).scrollTop()) + "px");
    else
        $el.css({ marginTop: -(~~$el.outerHeight()) / 2 });
    $el.css({ marginLeft: -(~~$el.outerWidth()) / 2 });
    
    $el.find('a.btn-layerClose').click(function () {
        init_popup();
        isDim ? $('.dim-layer').fadeOut() : $el.fadeOut(); // 닫기 버튼
        return false;
    });
    $('.layer .dimBg').click(function () { // 지금 여기 동작 안함. 상위 레이어에 인해서 씹힘
        init_popup();
        isDim ? $('.dim-layer').fadeOut() : $el.fadeOut(); // 닫기 버튼
        return false;
    });
}

function menu_cnt(idx, flag, table_num) { // 장바구니 단일 메뉴 9개이상 X 함수
    if (table_num == 2 && flag && menu[table_num][idx].state < 30)
        menu[table_num][idx].state++;
    else if (flag && menu[table_num][idx].state < MAX_CHOICE) // up버튼 flag = true
        menu[table_num][idx].state++;
    else if (!flag && menu[table_num][idx].state >= 1) // down버튼 flag = false;
        menu[table_num][idx].state--;
    else if (table_num == 2 && flag && menu[table_num][idx].state == 30)
        alert("더이상 추가할 수 없습니다.");
    else if (flag && menu[table_num][idx].state == MAX_CHOICE)
        alert("더이상 추가할 수 없습니다.");
    print_list(0, table_num, true, false);
}

function clear_list() { // 레이어에서 나갈시 장바구니 초기화
    for (var i = 0; i < 3; i++)
        for (var j = 0; j < menu[i].length; j++)
            menu[i][j].state = 0;
    $(".btn_set button").css("background", "#333333"); // 구매버튼 회색 비활성화
    $('.float').fadeOut(0); // 플로팅 아이콘
    if (float_btn2 != null) {
        clearInterval(float_btn2);
        float_btn2 = null;
    }
    for (i = 0; i < 3; i++)
        document.getElementById("menu_list_" + i).innerHTML = "";
}

function init_popup() { // 팝업창 닫을시 초기화
    res[0] = res[1] = "";
    if (qr_repeat != null)
        clearInterval(qr_repeat), qr_repeat = null;
    if (scanner != null)
        scanner.stop(), scanner = null;
    qrcode = null;
    scan_popup = false;
}

function comma(str) { // 숫자에 ,찍기
    str = String(str);
    var len = str.length;
    var rtnStr = "";
    for (var i = 0, j = len; i < len; i++ , j--) {
        if (j % 3 === 0 && j !== len)
            rtnStr += ",";
        rtnStr += str.charAt(i);
    }
    return rtnStr;
}

function matchZero(n, digits) { // 7 -> 07
    var zero = '';
    n = n.toString();

    if (n.length < digits) {
        for (i = 0; i < digits - n.length; i++)
            zero += '0';
    }
    return zero + n;
}

function getDate(full = true) { // 구매시각 반환
    var html = "";
    var m = new Date();
    if (full) { // YYYY.MM.DD TT:MM:SS
        html += m.getFullYear() + ".";
        html += matchZero(m.getMonth() + 1, 2) + ".";
        html += matchZero(m.getDate(), 2) + " ";
        html += matchZero(m.getHours(), 2) + ":";
        html += matchZero(m.getMinutes(), 2) + ":";
        html += matchZero(m.getSeconds(), 2);
    }
    else { // YYYYMMDD
        html += m.getFullYear();
        html += matchZero(m.getMonth() + 1, 2);
        html += matchZero(m.getDate(), 2);
    }
    return html;
}

function logout() {
    if (confirm("로그아웃 하시겠습니까?"))
        location.replace('index.php');
}

function rand() { // QR코드 갱신용 쓰레기값 함수
    switch (Math.floor(Math.random() * (4 - 1)) + 1) {
        case 1: return encodeURIComponent(String.fromCharCode(Math.floor(Math.random() * (58 - 48)) + 48));
        case 2: return encodeURIComponent(String.fromCharCode(Math.floor(Math.random() * (91 - 65)) + 65));
        default: return encodeURIComponent(String.fromCharCode(Math.floor(Math.random() * (123 - 97)) + 97));
    }
}

function getType(i) { // 식권 구매 내역 식당별 출력
    if (i == 0) return "[중] ";
    if (i == 1) return "[학] ";
    if (i == 2) return "[교] ";
}

function histclick() { // 식권 구매 내역 토글 함수
    $('.history').slideToggle();
} 

function payModule() { // 결제 모듈
    if (session_time != getDate(false)) { // 로그인날짜와 오늘 날짜가 맞지않으면
        alert("오늘 날짜의 세션이 아닙니다.\n다시 로그인 해주세요.");
        location.replace('index.php');
    }
    var sum = 0, cnt = 0, token = "";
    for (var i = 0; i < menu[cur_table].length; i++)
        if (menu[cur_table][i].state >= 1) {
            sum += menu[cur_table][i].price * menu[cur_table][i].state;
            cnt += menu[cur_table][i].state;
        }
    token += "식권 " + cnt + " 장";

    BootPay.request({
        price: sum.toString(),//'10000', //실제 결제되는 가격
        application_id: '5cc7f458396fa6771abd07a8',
        name: token, //결제창에서 보여질 이름
        pg: '',
        method: '', //결제수단, 입력하지 않으면 결제수단 선택부터 화면이 시작합니다.
        show_agree_window: 0, // 부트페이 정보 동의 창 보이기 여부
        order_id: '고유order_id_1234', //고유 주문번호로, 생성하신 값을 보내주셔야 합니다.
        params: { callback1: '그대로 콜백받을 변수 1', callback2: '그대로 콜백받을 변수 2', customvar1234: '변수명도 마음대로' },
        account_expire_at: '2018-05-25', // 가상계좌 입금기간 제한 ( yyyy-mm-dd 포멧으로 입력해주세요. 가상계좌만 적용됩니다. )
        extra: {
            start_at: '2018-10-10', // 정기 결제 시작일 - 시작일을 지정하지 않으면 그 날 당일로부터 결제가 가능한 Billing key 지급
            end_at: '2021-10-10', // 정기결제 만료일 -  기간 없음 - 무제한
            vbank_result: 1, // 가상계좌 사용시 사용, 가상계좌 결과창을 볼지(1), 말지(0), 미설정시 봄(1)
            quota: '0,2,3' // 결제금액이 5만원 이상시 할부개월 허용범위를 설정할 수 있음, [0(일시불), 2개월, 3개월] 허용, 미설정시 12개월까지 허용
        }
    }).error(function (data) {
        //결제 진행시 에러가 발생하면 수행됩니다.
        console.log("결제에러!");
        console.log(data);
    }).cancel(function (data) {
        alert("결제가 취소되었습니다.");
        //결제가 취소되면 수행됩니다.
        console.log(data);
    }).ready(function (data) {
        // 가상계좌 입금 계좌번호가 발급되면 호출되는 함수입니다.
        console.log(data);
    }).confirm(function (data) {
        //결제가 실행되기 전에 수행되며, 주로 재고를 확인하는 로직이 들어갑니다.
        //주의 - 카드 수기결제일 경우 이 부분이 실행되지 않습니다.
        console.log(data);
        var enable = true; // 재고 수량 관리 로직 혹은 다른 처리
        if (enable) {
            this.transactionConfirm(data); // 조건이 맞으면 승인 처리를 한다.
        } else {
            this.removePaymentWindow(); // 조건이 맞지 않으면 결제 창을 닫고 결제를 승인하지 않는다.
        }
    }).close(function (data) {
        // 결제창이 닫힐때 수행됩니다. (성공,실패,취소에 상관없이 모두 수행됨)
        console.log(data);
    }).done(function (data) {  //결제가 정상적으로 완료되면 수행
        var _key = new Array();
        for (var i = 0; i < menu[cur_table].length; i++)
            for (var j = 0; j < menu[cur_table][i].state; j++)
                _key.push({ id: ID, name: menu[cur_table][i].name, time: getDate() + "^" + (j + 1), table:cur_table, session_time: session_time });
        $.ajax({
            url: "payment.php",
            method: "post",
            data: { _key: JSON.stringify(_key) },
            success: function (res) {
                console.log(res);
            }
        });
        setTimeout(function () {
            window.location.href = "#tic";
            window.location.reload(true);
        }, 800);
        console.log(data);
    });
}

// booting.js include
(function($) { // layer 클릭 관련 함수
    var $window = $(window),
        $body = $('body'),
        $wrapper = $('#wrapper'),
        $header = $('#header'),
        $footer = $('#footer'),
        $main = $('#main'),
        $main_articles = $main.children('article');
    // Breakpoints.
    breakpoints({
        xlarge: ['1281px', '1680px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: ['481px', '736px'],
        xsmall: ['361px', '480px'],
        xxsmall: [null, '360px']
    });
    // Play initial animations on page load.
    $window.on('load', function () {
        window.setTimeout(function () {
            $body.removeClass('is-preload');
        }, 100);
    });
    // Fix: Flexbox min-height bug on IE.
    if (browser.name == 'ie') {
        var flexboxFixTimeoutId;
        $window.on('resize.flexbox-fix', function () {
            clearTimeout(flexboxFixTimeoutId);
            flexboxFixTimeoutId = setTimeout(function () {
                if ($wrapper.prop('scrollHeight') > $window.height())
                    $wrapper.css('height', 'auto');
                else
                    $wrapper.css('height', '100vh');
            }, 250);
        }).triggerHandler('resize.flexbox-fix');
    }
    // Nav.
    var $nav = $header.children('nav'),
        $nav_li = $nav.find('li');
    // Add "middle" alignment classes if we're dealing with an even number of items.
    if ($nav_li.length % 2 == 0) {
        $nav.addClass('use-middle');
        $nav_li.eq(($nav_li.length / 2)).addClass('is-middle');
    }
    // Main.
    var delay = 325,
        locked = false;
    // Methods.
    $main._show = function (id, initial) {
        var $article = $main_articles.filter('#' + id);
        // No such article? Bail.
        if ($article.length == 0)
            return;
        // Handle lock.
        // Already locked? Speed through "show" steps w/o delays.
        if (locked || (typeof initial != 'undefined' && initial === true)) {
            // Mark as switching.
            $body.addClass('is-switching');
            // Mark as visible.
            $body.addClass('is-article-visible');
            // Deactivate all articles (just in case one's already active).
            $main_articles.removeClass('active');
            // Hide header, footer.
            $header.hide();
            $footer.hide();
            // Show main, article.
            $main.show();
            $article.show();
            // Activate article.
            $article.addClass('active');
            // Unlock.
            locked = false;
            // Unmark as switching.
            setTimeout(function () {
                $body.removeClass('is-switching');
            }, (initial ? 1000 : 0));

            return;
        }
        // Lock.
        locked = true;
        // Article already visible? Just swap articles.
        if ($body.hasClass('is-article-visible')) {
            // Deactivate current article.
            var $currentArticle = $main_articles.filter('.active');
            $currentArticle.removeClass('active');
            // Show article.
            setTimeout(function () {
                // Hide current article.
                $currentArticle.hide();
                // Show article.
                $article.show();
                // Activate article.
                setTimeout(function () {
                    $article.addClass('active');
                    // Window stuff.
                    $window
                        .scrollTop(0)
                        .triggerHandler('resize.flexbox-fix');
                    // Unlock.
                    setTimeout(function () {
                        locked = false;
                    }, delay);
                }, 25);
            }, delay);
        }
        // Otherwise, handle as normal.
        else {
            // Mark as visible.
            $body
                .addClass('is-article-visible');
            // Show article.
            setTimeout(function () {
                // Hide header, footer.
                $header.hide();
                $footer.hide();
                // Show main, article.
                $main.show();
                $article.show();
                // Activate article.
                setTimeout(function () {
                    $article.addClass('active');
                    // Window stuff.
                    $window
                        .scrollTop(0)
                        .triggerHandler('resize.flexbox-fix');
                    // Unlock.
                    setTimeout(function () {
                        locked = false;
                    }, delay);
                }, 25);
            }, delay);
        }
    };
    $main._hide = function (addState) {
        if (!float_btn) {
            var $article = $main_articles.filter('.active');
            // Article not visible? Bail.
            if (!$body.hasClass('is-article-visible'))
                return;
            // Add state?
            if (typeof addState != 'undefined'
                && addState === true)
                history.pushState(null, null, '#');
            // Handle lock.
            // Already locked? Speed through "hide" steps w/o delays.
            if (locked) { // -------- layer 바깥부분 클릭시 호출 (창닫기)
                // Mark as switching.
                $body.addClass('is-switching');
                // Deactivate article.
                $article.removeClass('active');
                // Hide article, main.
                $article.hide();
                $main.hide();
                // Show footer, header.
                $footer.show();
                $header.show();
                // Unmark as visible.
                $body.removeClass('is-article-visible');

                // qr_popup_close ********************
                init_popup();
                if ($el != null)
                    isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
                clear_list();

                // Unlock.
                locked = false;
                // Unmark as switching.
                $body.removeClass('is-switching');
                // Window stuff.
                $window
                    .scrollTop(0)
                    .triggerHandler('resize.flexbox-fix');
                return;

            }
            // Lock.
            locked = true;
            // Deactivate article.
            $article.removeClass('active');
            // Hide article.
            setTimeout(function () {
                // Hide article, main.
                $article.hide();
                $main.hide();
                // Show footer, header.
                $footer.show();
                $header.show();
                // Unmark as visible.
                setTimeout(function () {
                    $body.removeClass('is-article-visible');

                    // qr_popup_close ********************
                    init_popup();
                    if ($el != null)
                        isDim ? $('.dim-layer').fadeOut() : $el.fadeOut();
                    clear_list();

                    // Window stuff.
                    $window
                        .scrollTop(0)
                        .triggerHandler('resize.flexbox-fix');
                    // Unlock.
                    setTimeout(function () {
                        locked = false;
                    }, delay);
                }, 25);
            }, delay);
        };
    }
    // Articles.
    $main_articles.each(function () {
        var $this = $(this);
        // Close.
        $('<div class="close">Close</div>')
            .appendTo($this)
            .on('click', function () {
                location.hash = '';
                clear_list();
            });
        // Prevent clicks from inside article from bubbling.
        $this.on('click', function (event) {
            event.stopPropagation();
        });
    });
    // Events.
    $body.on('click', function (event) {
        // Article visible? Hide.
        if ($body.hasClass('is-article-visible'))
            $main._hide(true);
    });
    $window.on('keyup', function (event) {
        switch (event.keyCode) {
            case 27:
                // Article visible? Hide.
                if ($body.hasClass('is-article-visible'))
                    $main._hide(true);
                break;
            default: break;
        }
    });
    $window.on('hashchange', function (event) {
        // Empty hash?
        if (location.hash == ''
            || location.hash == '#') {
            // Prevent default.
            event.preventDefault();
            event.stopPropagation();
            // Hide.
            $main._hide();
        }
        // Otherwise, check for a matching article.
        else if ($main_articles.filter(location.hash).length > 0) {
            // Prevent default.
            event.preventDefault();
            event.stopPropagation();
            // Show article.
            $main._show(location.hash.substr(1));
        }
    });
    // Scroll restoration.
    // This prevents the page from scrolling back to the top on a hashchange.
    if ('scrollRestoration' in history)
        history.scrollRestoration = 'manual';
    else {
        var oldScrollPos = 0,
            scrollPos = 0,
            $htmlbody = $('html,body');
        $window
            .on('scroll', function () {
                oldScrollPos = scrollPos;
                scrollPos = $htmlbody.scrollTop();
            })
            .on('hashchange', function () {
                $window.scrollTop(oldScrollPos);
            });
    }
    // Initialize.
    // Hide main, articles.
    $main.hide();
    $main_articles.hide();
    // Initial article.
    if (location.hash != '' && location.hash != '#')
        $window.on('load', function () { $main._show(location.hash.substr(1), true); });
})(jQuery);