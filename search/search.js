var baseAPI = "http://dustingibson.com/api/";

function toDate(ts) {
    var date = new Date(ts * 1000);
    var day = (date.getDate()).toString();
    var month = (date.getMonth() + 1).toString();
    return  month + "/" + day + "/" + date.getFullYear();
}

$(document).ready( function () {
    $('#myTable').DataTable({
        autoWidth: false,
        iDisplayLength: 50,
        columns: [
            {title: "LINK", fnCreatedCell: function (nTd, sData, oData, iRow, iCol) {
                $(nTd).html("<a href='"+oData[0]+"'>LINK</a>");
                }},
            {title: "SCORE"},
            {title: "# REPLIES"},
            {title: "SUBREDDIT"},
            {title: "DATE",  fnCreatedCell: function (nTd, sData, oData, iRow, iCol) {
                $(nTd).html(toDate(oData[4]));
                }},
            {title: "COMMENT"},

        ] 
    });
    $.get(`${baseAPI}/subredditlist`, function(res) {
        for(var i=0; i < res.length; i++) {
             $("#subredditSearch").append(new Option(res[i].SUBREDDIT, res[i].SUBREDDIT));
        }
    });
});

function fetchComments() {
    var limit = $("#limitNumSearch")[0].value;
    var orderBy = "ASC";
    var orderCrit = $("#sortBySearch")[0].value;
    var keyword = $("#commentTextSearch")[0].value;
    var subreddit = $("#subredditSearch")[0].value;
    var date = $("#dateSearch")[0].value; 
    if(orderCrit === "COMMENTS" || orderCrit === "DATE") {
        orderBy = "DESC";
    }
    $.get(`${baseAPI}/fetchcomments?sort=${orderCrit}&sortOrder=${orderBy}&subreddit=${subreddit}&keyword=${keyword}&limit=${limit}&page=1&date=${date}`, function(res) {
        var datatable = new $.fn.dataTable.Api( "#myTable" );
        $('#myTable').dataTable().fnClearTable();
        for(var i=0; i < res.length; i++) {
            var curData = [res[i].LINK, res[i].SCORE, res[i].COMMENTS, res[i].SUBREDDIT, res[i].DATE, res[i].DATA];
            $('#myTable').dataTable().fnAddData(curData);
        }
        if(orderCrit === "COMMENTS") {
            $('#myTable').dataTable().fnSort([2,"desc"]);
        }
        else if(orderCrit == "DATE") {
            $('#myTable').dataTable().fnSort([4,"desc"]);
        }
        else if(orderCrit === "SCORE") {
            $('#myTable').dataTable().fnSort([1,"asc"]);
        }
        datatable.draw();
    });
}