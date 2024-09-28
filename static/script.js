$(document).ready(function () {
    
    let currentChatId = null;
    let chats = {};
    let isSidebarCollapsed = false;
    let username = localStorage.getItem('username') || '';

    function loadChatHistory() {
        chats = JSON.parse(localStorage.getItem('examTellerChats')) || {};
        updateChatList();

        isSidebarCollapsed = JSON.parse(localStorage.getItem('isSidebarCollapsed')) || false;

        if (isSidebarCollapsed) {
            $('.sidebar').addClass('collapsed');
            $('.main-chat').addClass('full-width');
        } else {
            $('.sidebar').removeClass('collapsed');
            $('.main-chat').removeClass('full-width');
        }

        currentChatId = localStorage.getItem('currentChatId');
        if (currentChatId && chats[currentChatId]) {
            switchToChat(currentChatId);
        } else if (Object.keys(chats).length > 0) {
            switchToChat(Object.keys(chats)[0]);
        } else {
            newChat();
        }

        if (!username) {
            showUsernamePopup(true);
        }
    }

    function showUsernamePopup(isFirstTime = false) {
        $('#username-popup').show();
        $('body').addClass('popup-active');
        $('#username-form-cancel').toggle(!isFirstTime);
        $('#username-popup h3').text(isFirstTime ? 'Set Your Username' : 'Change Your Username');
        $('#username-input').val(isFirstTime ? '' : username);
    }

    $('#username-form').submit(function(e) {
        e.preventDefault();
        const newUsername = $('#username-input').val().trim();
        if (newUsername) {
            updateUsername(newUsername);
            $('#username-popup').hide();
            $('body').removeClass('popup-active');
        }
    });

    $('#username-form-cancel').click(function() {
        $('#username-popup').hide();
        $('body').removeClass('popup-active');
    });

    $('#change-username').click(function() {
        showUsernamePopup(false);
    });

    function updateUsername(newUsername) {
        const oldUsername = username;
        username = newUsername;
        localStorage.setItem('username', username);
        
        // Update username in all chats
        Object.keys(chats).forEach(chatId => {
            chats[chatId].content = chats[chatId].content.replace(
                new RegExp(`<strong>${oldUsername || 'You'}:</strong>`, 'g'),
                `<strong>${username}:</strong>`
            );
        });
        
        saveChatHistory();
        
        // Update current chat display
        if (currentChatId) {
            $('#responses').html(chats[currentChatId].content);
        }
    }

    function saveChatHistory() {
        localStorage.setItem('examTellerChats', JSON.stringify(chats));
        localStorage.setItem('currentChatId', currentChatId);
        localStorage.setItem('isSidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }

    function updateChatList() {
        $('#chat-list').empty();

        const sortedChatIds = Object.keys(chats).sort((a, b) => chats[b].lastUsed - chats[a].lastUsed);
        const groupedChats = groupChatsByDate(sortedChatIds);

        Object.keys(groupedChats).forEach((dateString) => {
            const dateHeader = $('<div>').addClass('chat-date-header').text(dateString);
            $('#chat-list').append(dateHeader);

            groupedChats[dateString].forEach((chatId) => {
                const chatName = chats[chatId].name || `Chat ${chatId}`;
                const chatItem = createChatItem(chatId, chatName);
                $('#chat-list').append(chatItem);
            });
        });
    }

    function groupChatsByDate(chatIds) {
        const groupedChats = {};
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        groupedChats[today] = [];

        chatIds.forEach((chatId) => {
            const date = new Date(chats[chatId].lastUsed);
            const dateString = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            if (dateString === today) {
                groupedChats[today].push(chatId);
            } else {
                if (!groupedChats[dateString]) {
                    groupedChats[dateString] = [];
                }
                groupedChats[dateString].push(chatId);
            }
        });

        return groupedChats;
    }

    function createChatItem(chatId, chatName) {
        const truncatedChatName = truncateString(chatName, 20);
        const chatItem = $('<div>')
            .addClass('chat-item')
            .html(`
                <span class="chat-name" title="${chatName}">${truncatedChatName}</span>
                <span class="chat-menu-trigger">⋮</span>
                <div class="chat-menu">
                    <div class="chat-menu-item rename-chat">Rename</div>
                    <div class="chat-menu-item delete-chat">Delete</div>
                </div>
            `)
            .data('chat-id', chatId);

        if (chatId === currentChatId) {
            chatItem.addClass('active');
        }

        chatItem.on('click', function (e) {
            if (!$(e.target).hasClass('chat-menu-trigger') && !$(e.target).hasClass('chat-menu-item')) {
                switchToChat(chatId);
            }
        });

        chatItem.find('.chat-menu-trigger').click((e) => {
            e.stopPropagation();
            chatItem.find('.chat-menu').toggleClass('show');
        });
        chatItem.find('.rename-chat').click((e) => {
            e.stopPropagation();
            showRenamePopup(chatId);
        });
        chatItem.find('.delete-chat').click((e) => {
            e.stopPropagation();
            showDeletePopup(chatId);
        });

        return chatItem;
    }

    function truncateString(str, maxLength) {
        if (str.length <= maxLength) {
            return str;
        }
        return str.slice(0, maxLength) + '...';
    }

    function switchToChat(chatId) {
        currentChatId = chatId;
        $('#responses').html(chats[chatId].content);
        chats[chatId].lastUsed = Date.now();
        updateChatList();
        saveChatHistory();
        scrollToBottom();
        toggleCustomQuestions();
    }

    function deleteChat(chatId) {
        if (chatId) {
            delete chats[chatId];
            saveChatHistory();
            if (Object.keys(chats).length > 0) {
                switchToChat(Object.keys(chats)[0]);
            } else {
                newChat();
            }
        }
    }

    function newChat() {
        const chatId = Date.now().toString();
        chats[chatId] = {
            name: 'New Chat',
            content: '',
            lastUsed: Date.now()
        };
        switchToChat(chatId);
        saveChatHistory();
    }

    function clearChat(chatId) {
        if (chatId) {
            chats[chatId].content = '';
            $('#responses').empty();
            saveChatHistory();
            toggleCustomQuestions();
        }
    }

    function renameChat(chatId, newName) {
        if (chatId && newName && newName.trim()) {
            const chatItem = $(`.chat-item[data-chat-id="${chatId}"]`);
            const chatNameSpan = chatItem.find('.chat-name');
            chatNameSpan.html('<span class="typing-animation">...</span>');

            setTimeout(() => {
                chats[chatId].name = newName.trim();
                chats[chatId].lastUsed = Date.now();
                saveChatHistory();
                updateChatList();

                const truncatedNewName = truncateString(newName.trim(), 20);
                chatNameSpan.text(truncatedNewName);
                chatNameSpan.attr('title', newName.trim());
            }, 1000);
        }
    }

    function showRenamePopup(chatId) {
        $('#new-chat-name').val(chats[chatId].name);
        $('#rename-popup').show();
        $('#new-chat-name').focus();

        $('#confirm-rename').off('click').on('click', function () {
            const newName = $('#new-chat-name').val();
            renameChat(chatId, newName);
            $('#rename-popup').hide();
        });

        $('#cancel-rename').off('click').on('click', function () {
            $('#rename-popup').hide();
        });
    }

    function showDeletePopup(chatId) {
        showConfirmationPopup('Are you certain you wish to permanently delete this chat?',"Delete", () => {
            deleteChat(chatId);
        });
    }

    function showClearChatPopup(chatId) {
        showConfirmationPopup('Are you certain you wish to permanently clear the chat history?',"clear", () => {     
            clearChat(chatId);
        });
    }

    function showConfirmationPopup(message,heading, onConfirm) {
        $('#popup .cookieHeading').text(message);
        const head = document.getElementById("delete-heading")
        head.innerText = heading
        $('#popup').show();

        $('.acceptButton').off('click').on('click', function () {
            onConfirm();
            $('#popup').hide();
        });

        $('.declineButton').off('click').on('click', function () {
            $('#popup').hide();
        });
    }

    function deleteAllHistory() {
        showConfirmationPopup('Are you certain you want to delete all chat history?',"Delete", () => {
            chats = {};
            saveChatHistory();
            newChat();
        });
    }

    function scrollToBottom() {
        var responseContainer = $('#responses');
        responseContainer.scrollTop(responseContainer[0].scrollHeight);
    }

    function adjustTextareaHeight() {
        var textarea = $('#query');
        textarea.css('height', 'auto');
        var newHeight = Math.min(textarea.prop('scrollHeight'), 200);
        textarea.css('height', newHeight + 'px');
    }

    function formatCodeBlocks(content) {
        // Handle code blocks with language specification
        content = content.replace(/```(\w+)\n([\s\S]*?)```/g, function(match, language, code) {
            return '<pre class="code-block"><code class="language-' + language + '">' + escapeHtml(code.trim()) + '</code></pre>';
        });

        // Handle code blocks without language specification
        content = content.replace(/```([\s\S]*?)```/g, function(match, code) {
            return '<pre class="code-block"><code>' + escapeHtml(code.trim()) + '</code></pre>';
        });

        // Handle inline code
        content = content.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        return content;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function toggleCustomQuestions() {
        if ($('#responses').is(':empty') && $('#query').val().trim() === '') {
            $('#custom-questions').show();
        } else {
            $('#custom-questions').hide();
        }
    }

    loadChatHistory();
    $('#sidebar-toggle').click(function () {
        $('.sidebar').toggleClass('collapsed');
        $('.main-chat').toggleClass('full-width');
        isSidebarCollapsed = $('.sidebar').hasClass('collapsed');
        saveChatHistory();
    });

    $('#new-chat').click(newChat);
    $('#delete-all-history').click(deleteAllHistory);
    $('#clear-chat').click(() => showClearChatPopup(currentChatId));

    $('#query').on('input', function () {
        adjustTextareaHeight();
        toggleCustomQuestions();
    });

    $('#query').on('keypress', function (event) {
        if (event.which === 13 && !event.shiftKey) {
            event.preventDefault();
            $('#query-form').submit();
        }
    });

    $('.custom-question-box').click(function () {
        const question = $(this).data('question');
        $('#query').val(question);
        $('#query-form').submit();
    });

    const textarea = document.getElementById('query');
    const button = document.getElementById('submitBtn');

    textarea.addEventListener('input', function () {
        if (textarea.value.trim() !== "") {
            button.classList.add('active');
            button.disabled = false;
        } else {
            button.classList.remove('active');
            button.disabled = true;
        }
    });

    $('#query-form').on('submit', function (event) {
        event.preventDefault();
        var userInput = $('#query').val();

        if (userInput.trim() === '') {
            return;
        }

        $('#loading-bar').show();
        $('button[type="submit"]').prop('disabled', true);

        $.ajax({
            url: '/',
            type: 'POST',
            data: { query: userInput },
            success: function (data) {
                var currentDate = new Date();
                var dateTimeString = currentDate.toLocaleString();

                var formattedBotOutput = formatCodeBlocks(data.bot_output);

                var newContent =
                    '<div class="user-response"><strong>' + (username || 'You') + ':</strong> ' + escapeHtml(data.user_input) + '</div>' +
                    '<div class="bot-response"><strong>' + botName + '</strong> <small>' + dateTimeString + '</small><br>' + formattedBotOutput + '</div>';

                $('#responses').append(newContent);
                chats[currentChatId].content += newContent;
                chats[currentChatId].lastUsed = Date.now();

                if (chats[currentChatId].name === 'New Chat') {
                    chats[currentChatId].name = userInput;
                }

                updateChatList();
                scrollToBottom();
                saveChatHistory();
                $('#query').val('').css('height', 'auto');
                $('#loading-bar').hide();
                $('button[type="submit"]').prop('disabled', false);
                toggleCustomQuestions();
            },
            error: function () {
                $('#loading-bar').hide();
                $('#offensive-popup').fadeIn();
                $('button[type="submit"]').prop('disabled', false);
            }
        });
    });

    $('#offensive-popup-close').on('click', function () {
        $('#offensive-popup').fadeOut();
    });

    $(document).on('click', function (event) {
        if (!$(event.target).closest('.chat-item').length) {
            $('.chat-menu').removeClass('show');
        }
    });

    $(window).on('resize', function () {
        adjustTextareaHeight();
        scrollToBottom();
    });

    toggleCustomQuestions();
});