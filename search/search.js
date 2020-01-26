var baseAPI = "http://localhost:3110";

$(document).ready( function () {
    $('#myTable').DataTable({
        autoWidth: false,
        columns: [
            {title: "LINK", fnCreatedCell: function (nTd, sData, oData, iRow, iCol) {
                $(nTd).html("<a href='"+oData[0]+"'>LINK</a>");
                }},
            {title: "SCORE"},
            {title: "# REPLIES"},
            {title: "SUBREDDIT"},
            {title: "COMMENT"},

        ] 
    });
    $.get(`${baseAPI}/subredditlist`, function(res) {
        for(var i=0; i < res.length; i++) {
            console.log(res[i].SUBREDDIT);
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
    if(orderCrit === "COMMENTS") {
        orderBy = "DESC";
    }
    $.get(`${baseAPI}/fetchcomments?sort=${orderCrit}&sortOrder=${orderBy}&subreddit=${subreddit}&keyword=${keyword}&limit=${limit}&page=1`, function(res) {
        var datatable = new $.fn.dataTable.Api( "#myTable" );
        $('#myTable').dataTable().fnClearTable();
        for(var i=0; i < res.length; i++) {
            var curData = [res[i].LINK, res[i].SCORE, res[i].COMMENTS, res[i].SUBREDDIT, res[i].DATA];
            $('#myTable').dataTable().fnAddData(curData);
        }
        if(orderCrit === "COMMENTS") {
            $('#myTable').dataTable().fnSort([2,"desc"]);
        }
        else {
            $('#myTable').dataTable().fnSort([1,"asc"]);
        }
        datatable.draw();
    });
}