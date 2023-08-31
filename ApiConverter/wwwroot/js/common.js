var common;
(function (common, $) {

    function alert(message, callback) {
        $('#alert .modal-body').html(message);

        $('#alert').modal('show');

        if (callback) {
            $('#alert').on('hidden.bs.modal', function () {
                setTimeout(function () {
                    callback();
                }, 0);
            });
        }
    }

    common.alert = alert;

    function isValidJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    common.isValidJson = isValidJson;

    function saveFile(blob, fileName, fileExtension) {
        var url = window.URL.createObjectURL(blob);
        var $link = $('<a />');
        $link.css('display', 'none');
        $link.attr('href', url);
        $link.attr('download', fileName + '.' + fileExtension);
        $('body').append($link);
        $link.get(0).click();

        setTimeout(function () {
            window.URL.revokeObjectURL(url);
            $('body').remove($link);
        }, 0);
    }

    common.saveFile = saveFile;

})(common || (common = {}), jQuery);