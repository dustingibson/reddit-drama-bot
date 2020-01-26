var baseAPI = "http://localhost:3110";

$(document).ready( function () {
    $('#myTable').DataTable({
        columns: [
            {title: "LINK", fnCreatedCell: function (nTd, sData, oData, iRow, iCol) {
                $(nTd).html("<a href='"+oData[0]+"'>LINK</a>");
                }},
            {title: "COMMENT"},
            {title: "SCORE"},
            {title: "# REPLIES"}
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
    $.get(`${baseAPI}/fetchcomments?sort=COMMENTS&sortOrder=DESC&subreddit=AmITheAsshole&keyword=M&limit=100&page=1`, function(res) {
        console.log(res);
        var datatable = new $.fn.dataTable.Api( "#myTable" );
        $('#myTable').dataTable().fnClearTable();
        for(var i=0; i < res.length; i++) {
            var curData = [res[i].LINK, res[i].DATA, res[i].SCORE, res[i].COMMENTS];
            $('#myTable').dataTable().fnAddData(curData);
        }
        datatable.draw();
    });
}