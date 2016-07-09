/**
 * SlackChat
 * 
 * @author  Mateusz Bartocha
 * @email   contact@bestcoding.net
 * @www     https://bestcoding.net
 * 
 * MIT License
 * 
 * Copyright (c) 2016 Mateusz Bartocha

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

window.SLACKCHAT = {
    cookie: {
        /**
         * Set cookie
         * @param string name
         * @param string value
         * @param integer exp
         */
        set: function (name, value, exp)
        {
            var date = new Date();
            date.setTime(date.getTime() + exp);

            document.cookie = name + '=' + value + '; expires=' + date.toGMTString() + '; path=/';
        },
        /**
         * Get cookie
         * @param string name
         * @returns string
         */
        get: function (name)
        {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++)
            {
                var c = ca[i];
                while (c.charAt(0) === ' ')
                    c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0)
                    return c.substring(nameEQ.length, c.length);
            }
            return null;
        },
        /**
         * Delete cookie
         * @param string name
         */
        del: function (name)
        {
            SLACKCHAT.cookie.set(name, '', -1);
        }
    },
    /**
     * Latest downloaded message time
     * @type integer
     */
    LATEST_MSG_TIME: 0,
    /**
     * Slack API URL
     * @type string
     */
    SLACK_API_URL: 'https://slack.com/api/',
    /**
     * Chat container
     * @type object from jQuery
     */
    CHAT_CONTAINER: null,
    /**
     * Is window focused?
     * @type boolean
     */
    WINDOW_FOCUS: false,
    /**
     * Options container
     * @type object
     */
    OPTIONS: {
        /**
         * Debug mode
         * @type boolean
         */
        debugMode: true,
        /**
         * Slack API token
         * https://api.slack.com/tokens/
         * @type string
         */
        token: '',
        /**
         * Slack web hook url
         * https://my.slack.com/services/new/incoming-webhook/
         * @type string
         */
        web_hook_url: '',
        /**
         * Load messages interval in seconds
         * @type integer
         */
        loadMessagesInterval: 2,
        /**
         * Chat refreshing resistant
         * @type boolean
         */
        refreshResistant: true,
        /**
         * Channel data
         * @type object
         */
        channel: {
            id: null,
            name: ''
        },
        /**
         * User data
         * @type object
         */
        user: {
            name: '',
            email: ''
        }
    },
    chat: {
        /**
         * Load chat messages
         */
        loadMessages: function ()
        {
            $.ajax({
                url: SLACKCHAT.SLACK_API_URL + "channels.history",
                dataType: 'json',
                type: "POST",
                data: {
                    token: SLACKCHAT.OPTIONS.token,
                    channel: SLACKCHAT.OPTIONS.channel.id,
                    oldest: SLACKCHAT.LATEST_MSG_TIME,
                    inclusive: 1
                },
                success: function (resp)
                {
                    if (SLACKCHAT.OPTIONS.debugMode)
                        console.log(resp);

                    if (resp.ok !== true)
                        return;

                    SLACKCHAT.MESSAGES = resp.messages;

                    if (SLACKCHAT.OPTIONS.debugMode)
                        console.log(SLACKCHAT.MESSAGES);

                    if (resp.oldest)
                        SLACKCHAT.LATEST_MSG_TIME = parseFloat(resp.oldest);

                    if (typeof SLACKCHAT.MESSAGES === "undefined" || SLACKCHAT.MESSAGES.length === 0)
                        return;

                    skipMsg = (SLACKCHAT.LATEST_MSG_TIME === 0);

                    if (skipMsg)
                        $('.chat').html('');

                    if (typeof Notification !== 'undefined' && resp.oldest
                            && SLACKCHAT.LATEST_MSG_TIME > 0 && SLACKCHAT.WINDOW_FOCUS === false
                            && typeof SLACKCHAT.MESSAGES[0].username === "undefined")
                    {
                        var notification = new Notification('SLACKCHAT: New message', {
                            icon: 'img/icon.png',
                            body: SLACKCHAT.MESSAGES[0].text
                        });

                        notification.onclick = function ()
                        {
                            window.focus();
                            this.close();
                        };
                    }

                    SLACKCHAT.LATEST_MSG_TIME = parseFloat(SLACKCHAT.MESSAGES[0].ts) + 0.01;

                    SLACKCHAT.MESSAGES.reverse();

                    for (var i in SLACKCHAT.MESSAGES)
                    {
                        if (skipMsg)
                        {
                            skipMsg = false;
                            continue;
                        }

                        // format message time
                        formattedTime = moment(parseFloat(SLACKCHAT.MESSAGES[i].ts) * 1000)
                                .format("DD-MM-YYYY HH:mm:ss");

                        // check if message incoming/outgoing
                        isIncoming = (typeof SLACKCHAT.MESSAGES[i].username === "undefined");

                        // create message box
                        out = '<div class="msg ' + ((isIncoming) ? 'in' : 'out') + '"><div class="triangle"></div>';

                        // append avatar if incoming message
                        if (isIncoming)
                            out += '<div class="avatar"></div>';

                        txt = SLACKCHAT.MESSAGES[i].text.replace(new RegExp('\n', 'g'), '<br>');

                        // replace emoji to img
                        txt = txt.replace(new RegExp(':([^:]+):', 'g'), '<img class="emoji" src="img/emojis/$1.png">');

                        // replace url to anchor
                        txt = txt.replace(/<http([^\|]+)\|([^\>]+)>/g, '<a target="_blank" href="http$1">$2</a>');
                        txt = txt.replace(/<http([^>]+)>/i, '<a target="_blank" href="http$1">http$1</a>');

                        out += '<div class="content">' + txt + '</div>';
                        out += '<div class="time">' + formattedTime + '</div>';
                        out += '</div>';

                        // append message to chat
                        SLACKCHAT.findElem('.container > .content-block > .messages').append(out);

                        // scroll down
                        SLACKCHAT.findElem('.container > .content-block')
                                .scrollTop(SLACKCHAT.findElem('.container > .content-block > .messages').height());
                    }

                    setTimeout(function ()
                    {
                        SLACKCHAT.chat.loadMessages();
                    }, SLACKCHAT.OPTIONS.loadMessagesInterval * 1000);

                },
                error: function (resp)
                {
                    console.error('SLACKCHAT: messages load error: ');
                    console.log(resp);
                }
            });
        },
        /**
         * Send message
         * @param string txt
         */
        sendMessage: function (txt)
        {
            var payload = '"username":"' + SLACKCHAT.OPTIONS.user.name + ' <' + SLACKCHAT.OPTIONS.user.email + '>"';
            payload += ', "text": "' + txt + '", "channel": "#' + SLACKCHAT.OPTIONS.channel.name + '"';

            $.ajax({
                url: SLACKCHAT.OPTIONS.web_hook_url,
                type: "POST",
                dataType: 'json',
                processData: false,
                data: 'payload={' + payload + '}',
                success: function (resp)
                {
                    if (resp.ok === false && SLACKCHAT.OPTIONS.debugMode)
                    {
                        console.error('SLACKCHAT: Post Message failed with response: ');
                        console.log(resp);
                    }

                    console.log('SLACKCHAT: message sent');
                },
                error: function (resp)
                {
                    console.error('SLACKCHAT: message sending error: ');
                    console.log(resp);
                }
            });
        }
    },
    channel: {
        /**
         * Create chat channel
         * @param integer i
         */
        create: function ()
        {
            var channelName = SLACKCHAT.OPTIONS.user.name + moment(new Date()).format("__DD_MM_YYYY__HH_mm");

            $.ajax({
                url: SLACKCHAT.SLACK_API_URL + "channels.create",
                dataType: 'json',
                type: "POST",
                data: {
                    token: SLACKCHAT.OPTIONS.token,
                    name: channelName
                },
                success: function (resp)
                {
                    if (SLACKCHAT.OPTIONS.debugMode)
                        console.log(resp);

                    if (resp.ok === false)
                    {
                        console.error('SLACKCHAT: channel create error with name: ' + channelName);
                        if (resp.error === "name_taken")
                            return SLACKCHAT.channel.create();
                        else
                            return false;
                    }

                    console.log('SLACKCHAT: channel creation success, name: ' + channelName);

                    SLACKCHAT.OPTIONS.channel.id = resp.channel.id;
                    SLACKCHAT.OPTIONS.channel.name = resp.channel.name;

                    if (SLACKCHAT.OPTIONS.refreshResistant)
                        SLACKCHAT.cookie.set('slackchat_options', JSON.stringify(SLACKCHAT.OPTIONS));
                },
                error: function ()
                {
                    console.error('SLACKCHAT: channel create error');
                }
            });
        }
    },
    /**
     * Find one element in slackchat container
     * @param string key
     * @returns object
     */
    findElem: function (key)
    {
        return SLACKCHAT.CHAT_CONTAINER.find(key).eq(0);
    },
    /**
     * Init Slackchat
     * @param object _options
     */
    init: function (_options)
    {
        /**
         * Get permissions to show notifications on desktop
         */
        document.addEventListener('DOMContentLoaded', function ()
        {
            if (typeof Notification !== 'undefined' && Notification.permission !== "granted")
                Notification.requestPermission();
        });

        /**
         * Get chat container
         */
        SLACKCHAT.CHAT_CONTAINER = $(_options.container);

        if (SLACKCHAT.CHAT_CONTAINER.length === 0)
        {
            console.error('SLACKCHAT: container not found: ' + _options.container);
            return;
        }

        if (SLACKCHAT.OPTIONS.debugMode)
            console.log(SLACKCHAT.OPTIONS);

        /**
         * Check if exists options saved in cookie
         */
        cookie_options = JSON.parse(SLACKCHAT.cookie.get('slackchat_options'));
        if (cookie_options !== null && SLACKCHAT.OPTIONS.refreshResistant)
            $.extend(SLACKCHAT.OPTIONS, cookie_options);

        /**
         * Merge options
         */
        $.extend(SLACKCHAT.OPTIONS, _options);

        if (SLACKCHAT.OPTIONS.channel.id === null)
        { // chat not started
            SLACKCHAT.findElem('.starter').show();
        }
        else
        { // chat started - load messages
            SLACKCHAT.findElem('.starter').hide();
            SLACKCHAT.findElem('.footer-block').show();

            // update chat messages
            SLACKCHAT.chat.loadMessages();
        }

        /**
         * hide loader
         */
        SLACKCHAT.findElem('.loader').hide();

        /**
         * Chat init event handler
         */
        SLACKCHAT.CHAT_CONTAINER.on('click', '#initChat', function ()
        {
            if (SLACKCHAT.OPTIONS.user.name === "" || SLACKCHAT.OPTIONS.user.email === "")
                return;
            
            SLACKCHAT.OPTIONS.user.name = $('input#name').val();
            SLACKCHAT.OPTIONS.user.email = $('input#email').val();
            
            SLACKCHAT.channel.create();
            
            SLACKCHAT.findElem('.loader').hide();
            SLACKCHAT.findElem('.starter').hide();
            SLACKCHAT.findElem('.footer-block').show();
            
            SLACKCHAT.chat.loadMessages();
        });

        /**
         * Send message event handler - button
         */
        SLACKCHAT.CHAT_CONTAINER.on('click', '#sendMsg', function ()
        {
            SLACKCHAT.chat.sendMessage(SLACKCHAT.findElem('textarea#message').val());
            setTimeout(function ()
            {
                $('textarea#message').val('');
            }, 100);
        });

        /**
         * Watch shift key press
         */
        SLACKCHAT.shiftPressed = false;

        $(document).keydown(function (e)
        {
            SLACKCHAT.shiftPressed = e.shiftKey;
        });

        $(document).keyup(function ()
        {
            SLACKCHAT.shiftPressed = false;
        });

        /**
         * Send message event handler - enter
         */
        SLACKCHAT.CHAT_CONTAINER.on('keypress', '.footer-block', function (e)
        {
            if (e.which === 13 && SLACKCHAT.shiftPressed === false)
            {
                SLACKCHAT.findElem('.footer-block #sendMsg').trigger("click");
            }
        });

        /**
         * Window focus&blur event handler
         */
        $(window).focus(function ()
        {
            SLACKCHAT.WINDOW_FOCUS = true;
        }).blur(function ()
        {
            SLACKCHAT.WINDOW_FOCUS = false;
        });

    }
};
