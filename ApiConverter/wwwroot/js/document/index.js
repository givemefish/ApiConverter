(function ($, Cookies) {

    var apiDirty = [false, false, false, false, false];
    var upDirty = [false, false, false, false, false];

    $(document).ready(function () {        
        var tabTarget = Cookies.get('tabTarget') || '#convert-pane';
        if (tabTarget) {
            $('[data-bs-target="' + tabTarget + '"]').tab('show');            
        } 

        $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
            var tabTarget = $(e.target).attr('data-bs-target');
            Cookies.set('tabTarget', tabTarget);
        });

        var autoPretty = Cookies.get('autoPretty') !== 'false'; // default as true

        if (autoPretty) {
            $('#chkPretty').prop('checked', true);
        }

        $('#chkPretty').on('change', function () {
            Cookies.set('autoPretty', this.checked);
        });

        $('#inputSource').on('focus', function () {
            $(this).select();
        });

        $('body').bind('dragstart', function (e) {
            e.originalEvent.dataTransfer.effectAllowed = 'copyMove';
        });

        $('body').bind('dragend', function (e) {
            e.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        $('body').bind('dragover drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (e.type === 'drop') {
                var files = e.originalEvent.dataTransfer.files;
                var file = files[0];
                if (!file.name.endsWith('.json') || file.type !== 'application/json') {
                    common.alert('請輸入符合規範的JSON', function () {
                        $('#inputSource').focus();
                        $('#inputSource').select();
                    });
                    return;
                }

                var reader = new FileReader();
                reader.onloadend = function () {
                    var str = reader.result;
                    if (str.endsWith('\x04\x04')) {
                        str = str.substring(0, str.length - 2);
                    }
                    $('#inputSource').val(str);
                }
                reader.readAsText(file);
            }
        });

        $('#inputSource').blur(function () {
            if ($('#chkPretty').is(':checked')) {
                var value = $(this).val();
                if (common.isValidJson(value)) {
                    var newValue = JSON.stringify(JSON.parse(value), null, 2);
                    $(this).val(newValue);
                }
            }
        });

        $('#btnConvert').on('click', function () {
            var json = $('#inputSource').val();
            if (!common.isValidJson(json)) {
                common.alert('請輸入符合規範的JSON', function () {
                    $('#inputSource').focus();
                    $('#inputSource').select();
                });
                return;
            }

            var input = JSON.parse(json);
            var isGroup = input.data !== undefined;
            var fileName = input.name;
            if (!isGroup) {
                var updatedAt = new Date(input.updatedAt);
                var y = '' + updatedAt.getFullYear();
                var m = '' + (updatedAt.getMonth() + 1);
                var d = '' + updatedAt.getDate();
                if (m.length < 2) m = '0' + m;
                if (d.length < 2) d = '0' + d;
                fileName = `${input.name}-${y}${m}${d}`;
            }
                        
            $('#btnConvert').prop('disabled', true);

            $.ajax({
                url: window['baseUrl'] + 'Document/Convert',
                data: { json: json },
                type: 'POST',
                cache: false,
                xhr: function () {
                    var xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 2) {
                            if (xhr.status === 200) {
                                xhr.responseType = 'blob';
                            } else {
                                xhr.responseType = 'text';
                            }
                        }
                    };
                    return xhr;
                },
                success: function (blob) {
                    if (isGroup) {
                        common.saveFile(blob, fileName, 'zip');
                    } else {
                        common.saveFile(blob, fileName, 'docx');
                    }
                },
                error: function (err) {
                    common.alert(err.responseText);
                },
                complete: function () {
                    setTimeout(function () {                        
                        $('#btnConvert').prop('disabled', false);
                    }, 500);
                }
            });
        });

        $('details').click(function () {            
            $(this).siblings().removeAttr('open');
        });
        
        $(document).on('click', '#areaApiDocumentNote .btn-add, #areaUpDocumentNote .btn-add', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            var currentEntry = $(this).parents('.entry:first');
            if (currentEntry.siblings('.entry').length > 0) {
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));

                currentEntry.find('.btn-add').remove();
            } else {
                currentEntry.find('.btn-add').remove();
                currentEntry.find('.btn-wrapper:first').append('<button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button>');
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="" spellcheck="false"/></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDocumentNote .btn-remove, #areaUpDocumentNote .btn-remove', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            wrapper.find('.btn-add').remove();

            var currentEntry = $(this).parents('.entry:first');
            currentEntry.remove();

            if (wrapper.find('.entry').length == 1) {
                wrapper.find('.entry:last .btn-remove').remove();
                wrapper.find('.entry:last .btn-wrapper:first').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            } else if (wrapper.find('.entry').length > 1) {
                wrapper.find('.entry:last .btn-wrapper:last').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultInputRemark .btn-add, #areaUpDefaultInputRemark .btn-add', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            var currentEntry = $(this).parents('.entry:first');
            if (currentEntry.siblings('.entry').length > 0) {
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
                currentEntry.find('.btn-add').remove();
            } else {
                currentEntry.find('.btn-add').remove();
                currentEntry.find('.btn-wrapper:first').append('<button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button>');
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultInputRemark .btn-remove, #areaUpDefaultInputRemark .btn-remove', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            wrapper.find('.btn-add').remove();

            var currentEntry = $(this).parents('.entry:first');
            currentEntry.remove();

            if (wrapper.find('.entry').length == 1) {
                wrapper.find('.entry:last .btn-remove').remove();
                wrapper.find('.entry:last .btn-wrapper:first').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            } else if (wrapper.find('.entry').length > 1) {
                wrapper.find('.entry:last .btn-wrapper:last').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultInputMock .btn-add, #areaUpDefaultInputMock .btn-add', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            var currentEntry = $(this).parents('.entry:first');
            if (currentEntry.siblings('.entry').length > 0) {
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));

                currentEntry.find('.btn-add').remove();
            } else {
                currentEntry.find('.btn-add').remove();
                currentEntry.find('.btn-wrapper:first').append('<button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button>');
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultInputMock .btn-remove, #areaUpDefaultInputMock .btn-remove', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            wrapper.find('.btn-add').remove();

            var currentEntry = $(this).parents('.entry:first');
            currentEntry.remove();

            if (wrapper.find('.entry').length == 1) {
                wrapper.find('.entry:last .btn-remove').remove();
                wrapper.find('.entry:last .btn-wrapper:first').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            } else if (wrapper.find('.entry').length > 1) {
                wrapper.find('.entry:last .btn-wrapper:last').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            }

            setDirty(wrapper.attr('id'));
        });


        $(document).on('click', '#areaApiDefaultOutputRemark .btn-add, #areaUpDefaultOutputRemark .btn-add', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            var currentEntry = $(this).parents('.entry:first');
            if (currentEntry.siblings('.entry').length > 0) {
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));

                currentEntry.find('.btn-add').remove();
            } else {
                currentEntry.find('.btn-add').remove();
                currentEntry.find('.btn-wrapper:first').append('<button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button>');
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultOutputRemark .btn-remove, #areaUpDefaultOutputRemark .btn-remove', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            wrapper.find('.btn-add').remove();

            var currentEntry = $(this).parents('.entry:first');
            currentEntry.remove();

            if (wrapper.find('.entry').length == 1) {
                wrapper.find('.entry:last .btn-remove').remove();
                wrapper.find('.entry:last .btn-wrapper:first').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            } else if (wrapper.find('.entry').length > 1) {
                wrapper.find('.entry:last .btn-wrapper:last').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultOutputMock .btn-add, #areaUpDefaultOutputMock .btn-add', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            var currentEntry = $(this).parents('.entry:first');
            if (currentEntry.siblings('.entry').length > 0) {
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));

                currentEntry.find('.btn-add').remove();
            } else {
                currentEntry.find('.btn-add').remove();
                currentEntry.find('.btn-wrapper:first').append('<button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button>');
                wrapper.append($('<div class="entry my-2 d-flex gap-2">' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="" spellcheck="false" /></div>' +
                    '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="" spellcheck="false" /></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                    '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                    '</div>'));
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('click', '#areaApiDefaultOutputMock .btn-remove, #areaUpDefaultOutputMock .btn-remove', function (e) {
            e.preventDefault();
            var wrapper = $(this).closest('details');
            wrapper.find('.btn-add').remove();

            var currentEntry = $(this).parents('.entry:first');
            currentEntry.remove();

            if (wrapper.find('.entry').length == 1) {
                wrapper.find('.entry:last .btn-remove').remove();
                wrapper.find('.entry:last .btn-wrapper:first').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            } else if (wrapper.find('.entry').length > 1) {
                wrapper.find('.entry:last .btn-wrapper:last').append('<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>');
            }

            setDirty(wrapper.attr('id'));
        });

        $(document).on('change keyup paste', 'input[type=text]', function () {
            var wrapper = $(this).closest('details');
            setDirty(wrapper.attr('id'));
        });

        function setDirty(wrapperId) {                        
            switch (wrapperId) {
                case 'areaApiDocumentNote':
                    apiDirty[0] = true;
                    break;
                case 'areaApiDefaultInputRemark':
                    apiDirty[1] = true;
                    break
                case 'areaApiDefaultInputMock':
                    apiDirty[2] = true;
                    break
                case 'areaApiDefaultOutputRemark':
                    apiDirty[3] = true;
                    break
                case 'areaApiDefaultOutputMock':
                    apiDirty[4] = true;
                    break
                case 'areaUpDocumentNote':
                    upDirty[0] = true;
                    break;
                case 'areaUpDefaultInputRemark':
                    upDirty[1] = true;
                    break
                case 'areaUpDefaultInputMock':
                    upDirty[2] = true;
                    break
                case 'areaUpDefaultOutputRemark':
                    upDirty[3] = true;
                    break
                case 'areaUpDefaultOutputMock':
                    upDirty[4] = true;
                    break
                default:
                    break;
            }
        }

        $(document).on('click', '#btnSaveApiSettings, #btnSaveUpSettings', function () {            
            var mode = $(this).data('mode');
            var isValid = true;
            var dirty;            
            if (mode == 'Api') {
                dirty = apiDirty;
            } else {
                dirty = upDirty;
            }

            if (dirty[0]) {
                var listDocumentNote = [];
                $('#area' + mode + 'DocumentNote input').each(function (i, e) {
                    var value = $.trim($(this).val());
                    if (!value) {
                        isValid = false;
                        common.alert('請輸入文件備註', function () {
                            $(e).focus();
                        });
                        return false;
                    }
                    listDocumentNote.push(value);
                });
            }

            var mapDefaultInputRemark = {};
            if (dirty[1]) {
                $('#area' + mode + 'DefaultInputRemark .entry').each(function () {
                    var keyElement = $(this).find('.inputKey')
                    var key = $.trim(keyElement.val());
                    if (!key) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的鍵值', function () {
                            $(keyElement).focus();
                        });
                        return false;
                    }

                    var valueElement = $(this).find('.inputValue');
                    var value = $.trim(valueElement.val());
                    if (!value) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的值', function () {
                            $(valueElement).focus();
                        });
                        return false;
                    }

                    mapDefaultInputRemark[key] = value;
                });
            }

            var mapDefaultInputMock = {};
            if (dirty[2]) {
                $('#area' + mode + 'DefaultInputMock .entry').each(function () {
                    var keyElement = $(this).find('.inputKey')
                    var key = $.trim(keyElement.val());
                    if (!key) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的鍵值', function () {
                            $(keyElement).focus();
                        });
                        return false;
                    }

                    var valueElement = $(this).find('.inputValue');
                    var value = $.trim(valueElement.val());
                    if (!value) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的值', function () {
                            $(valueElement).focus();
                        });
                        return false;
                    }

                    mapDefaultInputMock[key] = value;
                });
            }

            var mapDefaultOutputRemark = {};
            if (dirty[3]) {
                $('#area' + mode + 'DefaultOutputRemark .entry').each(function () {
                    var keyElement = $(this).find('.inputKey')
                    var key = $.trim(keyElement.val());
                    if (!key) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的鍵值', function () {
                            $(keyElement).focus();
                        });
                        return false;
                    }

                    var valueElement = $(this).find('.inputValue');
                    var value = $.trim(valueElement.val());
                    if (!value) {
                        isValid = false;
                        common.alert('請輸入取代備註 (Input) 的值', function () {
                            $(valueElement).focus();
                        });
                        return false;
                    }

                    mapDefaultOutputRemark[key] = value;
                });
            }

            var mapDefaultOutputMock = {};
            if (dirty[4]) {
                $('#area' + mode + 'DefaultOutputMock .entry').each(function () {
                    var keyElement = $(this).find('.inputKey')
                    var key = $.trim(keyElement.val());
                    if (!key) {
                        isValid = false;
                        common.alert('請輸入取代模擬值 (Output) 的鍵值', function () {
                            $(keyElement).focus();
                        });
                        return false;
                    }

                    var valueElement = $(this).find('.inputValue');
                    var value = $.trim(valueElement.val());
                    if (!value) {
                        isValid = false;
                        common.alert('請輸入取代模擬值 (Output) 的值', function () {
                            $(valueElement).focus();
                        });
                        return false;
                    }

                    mapDefaultOutputMock[key] = value;
                });
            }

            if (!isValid) {
                return;
            }

            $('#btnSave' + mode + 'Settings').prop('disabled', true);

            var setTasks = [];

            if (dirty[0]) {
                setTasks.push($.post(window['baseUrl'] + 'Document/Set' + mode + 'DocumentNote', { list: listDocumentNote }));
            }

            if (dirty[1]) {
                setTasks.push($.post(window['baseUrl'] + 'Document/Set' + mode + 'DefaultInputRemark', { map: mapDefaultInputRemark }));
            }

            if (dirty[2]) {
                setTasks.push($.post(window['baseUrl'] + 'Document/Set' + mode + 'DefaultInputMock', { map: mapDefaultInputMock }));
            }

            if (dirty[3]) {
                setTasks.push($.post(window['baseUrl'] + 'Document/Set' + mode + 'DefaultOutputRemark', { map: mapDefaultOutputRemark }));
            }

            if (dirty[4]) {
                setTasks.push($.post(window['baseUrl'] + 'Document/Set' + mode + 'DefaultOutputMock', { map: mapDefaultOutputMock }));
            }

            $.when(...setTasks)
                .done(function () {
                    common.alert('儲存成功', function () {
                        location.reload();
                    });   
                })
                .fail(function () {
                    common.alert('儲存失敗');
                    $('#btnSave' + mode + 'Settings').prop('disabled', false);
                    dirty = [false, false, false, false];
                });
        });

        $.get(window['baseUrl'] + 'Document/GetApiDocumentNote')
            .done(function (res) {
                var wrapper = $('#areaApiDocumentNote');
                if (res.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="' + res[0] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>');
                    wrapper.append(inputField);
                } else if (res.length > 1) {
                    for (var i = 0; i < res.length; i++) {
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="' + res[i] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == res.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>');
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function () {
                common.alert('無法取得資料 - Api設定 文件備註');
            });

        $.get(window['baseUrl'] + 'Document/GetApiDefaultInputRemark')
            .done(function (res) {
                var wrapper = $('#areaApiDefaultInputRemark');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function () {
                common.alert('無法取得資料 - Api設定 取代備註 (Input)');
            });

        $.get(window['baseUrl'] + 'Document/GetApiDefaultInputMock')
            .done(function (res) {
                var wrapper = $('#areaApiDefaultInputMock');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - Api設定 取代模擬值 (Input)');
            });

        $.get(window['baseUrl'] + 'Document/GetApiDefaultOutputRemark')
            .done(function (res) {
                var wrapper = $('#areaApiDefaultOutputRemark');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - Api設定 取代備註 (Output)');
            });

        $.get(window['baseUrl'] + 'Document/GetApiDefaultOutputMock')
            .done(function (res) {
                var wrapper = $('#areaApiDefaultOutputMock');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - Api設定 取代模擬值 (Output)');
            });

        $.get(window['baseUrl'] + 'Document/GetUpDocumentNote')
            .done(function (res) {
                var wrapper = $('#areaUpDocumentNote');
                if (res.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="' + res[0] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>');
                    wrapper.append(inputField);
                } else if (res.length > 1) {
                    for (var i = 0; i < res.length; i++) {
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1 flex-shrink-0"><input type="text" class="form-control form-control-sm" value="' + res[i] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == res.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>');
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - UP設定 文件備註');
            });

        $.get(window['baseUrl'] + 'Document/GetUpDefaultInputRemark')
            .done(function (res) {
                var wrapper = $('#areaUpDefaultInputRemark');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - UP設定 取代備註 (Input)');
            });

        $.get(window['baseUrl'] + 'Document/GetUpDefaultInputMock')
            .done(function (res) {
                var wrapper = $('#areaUpDefaultInputMock');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - UP設定 取代模擬值 (Input)');
            });

        $.get(window['baseUrl'] + 'Document/GetUpDefaultOutputRemark')
            .done(function (res) {
                var wrapper = $('#areaUpDefaultOutputRemark');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - UP設定 取代備註 (Output)');
            });

        $.get(window['baseUrl'] + 'Document/GetUpDefaultOutputMock')
            .done(function (res) {
                var wrapper = $('#areaUpDefaultOutputMock');
                var keys = Object.keys(res);
                if (keys.length == 1) {
                    var inputField = $(
                        '<div class="entry my-2 d-flex gap-2">' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + keys[0] + '" spellcheck="false" /></div>' +
                        '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[keys[0]] + '" spellcheck="false" /></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-add btn-danger btn-sm" style="width: 2.5rem">+</button></div>' +
                        '<div class="btn-wrapper" style="min-width: 40px"></div>' +
                        '</div>')
                    wrapper.append(inputField);
                } else if (keys.length > 1) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var inputField = $(
                            '<div class="entry my-2 d-flex gap-2">' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputKey" value="' + key + '" spellcheck="false" /></div>' +
                            '<div class="flex-grow-1"><input type="text" class="form-control form-control-sm inputValue" value="' + res[key] + '" spellcheck="false" /></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px"><button class="btn btn-remove btn-danger btn-sm" style="width: 2.5rem">-</button></div>' +
                            '<div class="btn-wrapper" style="min-width: 40px">' + ((i == keys.length - 1) ? '<button class="btn btn-add btn-success btn-sm" style="width: 2.5rem">+</button>' : '') + '</div>' +
                            '</div>')
                        wrapper.append(inputField);
                    }
                }
            })
            .fail(function (err) {
                common.alert('無法取得資料 - UP 設定 取代模擬值 (Output)');
            });            

        $('#inputSource').focus();
    });

})(jQuery, Cookies);