

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('name').autofocus;

    const create_channel_template = Handlebars.compile(document.querySelector('#create-channel').innerHTML);

    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {
        socket.emit('load channels');
        if (localStorage.getItem('username') != null && localStorage.getItem('last_channel') != null) {
            socket.emit('load messages', { 'channel_name': localStorage.getItem('last_channel') });
        }
    });

    if (localStorage.getItem('username') === null) {

        document.getElementById('channels-div').style.display = 'none';

        document.querySelector('#submit-button').onclick = () => {
            document.getElementById('channels-div').style.display = 'flex';
            const name = document.querySelector('#name');
            socket.emit('create user', { 'user': name.value });
            document.getElementById('user-form').remove();
            const create_channel = create_channel_template({ 'username': name.value });
            document.querySelector('#create-channel-div').innerHTML = create_channel;
            name.value = "";
            document.getElementById('channels-div').style.display = 'flex';
            return false;
        };
    } else {
        document.getElementById('user-form').remove();
        const user = JSON.parse(localStorage.getItem('username'));
        const create_channel = create_channel_template({ 'username': user.name });
        document.querySelector('#create-channel-div').innerHTML = create_channel;
        document.getElementById('channels-div').style.display = 'flex';
    }


    socket.on('announce user', data => {
        user = JSON.parse(data);
        localStorage.setItem('username', JSON.stringify(user));
    });

    const channel_template = Handlebars.compile(document.querySelector('#channel-choice').innerHTML);

    socket.on('announce channels', data => {
        if (data.length === 0) {

        } else {
            data.forEach(element => {
                const elementJSON = JSON.parse(element)
                const channel = channel_template({ 'channel_name': `${elementJSON.channel_name}` });
                document.querySelector('#channels-div').innerHTML += channel;
            });
        }
    });

    const channel_messages_template = Handlebars.compile(document.querySelector('#channel-messages').innerHTML)
    const messages_template = Handlebars.compile(document.querySelector('#messages').innerHTML);

    document.addEventListener('click', event => {
        const element = event.target;

        if (element.id === 'create-channel-button') {
            const channel_name = document.querySelector('#create-channel-name').value;
            socket.emit('exists', { 'channel_name': channel_name });
            socket.on('exists channel', data => {
                if (data) {
                    alert('this channel already exists')
                } else {
                    document.querySelector('#create-channel-name').value = '';
                    socket.emit('create channel', { 'channel_name': channel_name });
                }
            });
        }


        if (element.className === 'channel-name') {
            const channel_name = element.innerHTML;
            const h1_name = channel_messages_template({ 'channel_name': channel_name });
            document.querySelector('#channel-div').innerHTML = h1_name;
            localStorage.setItem('last_channel', channel_name);
            socket.emit('load messages', { 'channel_name': channel_name })
        }

        if (element.id === 'send-message' || element.id === 'send-message' || element.id === 'plane') {
            const message = document.querySelector('#message').value;
            const channel_name = document.querySelector('#channel-name').innerHTML;
            document.querySelector('#message').value = '';
            socket.emit('send message', { 'message': message, 'channel_name': channel_name, 'user': JSON.parse(localStorage.getItem('username')) });
        }

        if (element.className === 'fas fa-times') {
            socket.emit('delete message', { 'message_id': element.parentElement.parentElement.children[2].innerHTML, 'current_channel': localStorage.getItem('last_channel') });
            console.log(localStorage.getItem('last_channel'));

        }

    });

    socket.on('announce delete', data => {
        document.querySelectorAll('.message-id').forEach(element => {
            if (element.innerHTML === data) {
                element.parentElement.remove();
            }
        });
    });

    socket.on('announce channel', data => {
        const dataJSON = JSON.parse(data.c);
        const channel = channel_template({ 'channel_name': `${dataJSON.channel_name}` });
        document.querySelector('#channels-div').innerHTML += channel;
    });

    document.addEventListener('keyup', event => {
        const element = event.target;
        if (event.keyCode === 13 && element.id === 'message') {
            const message = document.querySelector('#message').value;
            const channel_name = document.querySelector('#channel-name').innerHTML;
            document.querySelector('#message').value = '';
            socket.emit('send message', { 'message': message, 'channel_name': channel_name, 'user': JSON.parse(localStorage.getItem('username')) });
        }
        if (event.keyCode === 13 && element.id === 'create-channel-name') {
            const channel_name = document.querySelector('#create-channel-name').value;
            socket.emit('create channel', { 'channel_name': channel_name });
        }
    });

    socket.on('announce message', data => {
        dataJSON = JSON.parse(data.mJSON);
        const message = messages_template({ 'message': dataJSON.message, 'date_time': dataJSON.date, 'user': dataJSON.user.name, 'message_id': dataJSON.message_id });
        if (document.querySelector('#all-messages') != null) {
            if (data.counter > 100) {
                document.querySelector('.messages:first-child').remove();
            }
            document.querySelector('#all-messages').innerHTML += message;
            document.querySelector('#all-messages').scrollTop = document.querySelector('#all-messages').scrollHeight;
        }

        if (dataJSON.user.id != JSON.parse(localStorage.getItem('username')).id) {
            if (document.querySelector('.messages:last-child') != null) {
                document.querySelector('.messages:last-child').className = 'another-user';
            }
        }
    });

    socket.on('announce messages', data => {
        const h1_name = channel_messages_template({ 'channel_name': localStorage.getItem('last_channel') });
        document.querySelector('#channel-div').innerHTML = h1_name;
        data.forEach(element => {
            const elementJSON = JSON.parse(element)
            const messages = messages_template({ 'message': elementJSON.message, 'date_time': elementJSON.date, 'user': elementJSON.user.name, 'message_id': elementJSON.message_id });
            document.querySelector('#all-messages').innerHTML += messages;
            document.querySelector('#all-messages').scrollTop = document.querySelector('#all-messages').scrollHeight;
            if (elementJSON.user.id != JSON.parse(localStorage.getItem('username')).id) {
                document.querySelector('.messages:last-child').className = 'another-user';
            }
        });

    });
});