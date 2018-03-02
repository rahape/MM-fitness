function toggleEdit(id) {
    $("#edit" + id).toggle();
}

function toggleEditClass(id) {
    $(".edit" + id).toggle();
}

function toggleEditButtons(pasNumber) {
    $(".editButtons" + pasNumber).toggle();
    document.cookie = pasNumber;
};