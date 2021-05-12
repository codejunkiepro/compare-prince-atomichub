class MainUI {
    constructor() {
        this._socket = io()
        this._urls = null
    }

    init() {

        this._socket.on('fall', (url, price1, price2, rate) => {
            // console.log(url, price1, price2, 'fall')
            $(`[data-url="${url}"] td:nth-child(2)`).html(price1)
            $(`[data-url="${url}"] td:nth-child(3)`).html(price2)
            $(`[data-url="${url}"] td:nth-child(4)`).html(rate + '%')
            $(`[data-url="${url}"] td:nth-child(5)`).html('Yes')
            $('.play-sound').click()
            alert(`Fetch: ${url}`)
        })

        this._socket.on('unFall', (url, price1, price2, rate) => {
            $(`[data-url="${url}"] td:nth-child(2)`).html(price1)
            $(`[data-url="${url}"] td:nth-child(3)`).html(price2)
            $(`[data-url="${url}"] td:nth-child(4)`).html(rate + '%')
            $(`[data-url="${url}"] td:nth-child(5)`).html('No')
            // $('.play-sound').click()
        })

        this._socket.on('hello', (str) => {
            console.log(str)
        })

        this._socket.on('start', (urls, variables) => {
            this._urls = urls
            if (urls && urls.length) {
                urls.forEach(url => {
                    $('.url-table').append(`
                        <tr data-url="${url}">
                            <td><a href="${url}" target="_blank">${url}</a></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><buton class="remove-url btn btn-danger btn-sm">Delete</button></td>
                        </tr>
                    `)
                })
            }

            if (variables.rate) {
                $('#price').val(variables.rate)
            }
        })

        $(document).on('click', '.add-url', () => {
            if (this._urls) {
                const url = $('#url').val()

                if (!url) return alert('please add an url');
                if (!url.includes('https://wax.atomichub.io')) return alert('Must include https://wax.atomichub.io');
                if (this._urls.includes(url)) return alert('Already added')

                this._urls.push(url);

                this._socket.emit('add-url', url)
                $('.url-table').append(`
                        <tr data-url="${url}">
                            <td><a href="${url}" target="_blank">${url}</a></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><buton class="remove-url btn btn-danger">Delete</button></td>
                        </tr>
                    `)
            } else {
                alert('Got some issues')
                $('.add-url').prop('disabled', true)
            }
        })

        $(document).on('click', '.play-sound', () => {
            if (!$('#sound-check').is(':checked')) return
            var audio = new Audio('../sound/piece-of-cake-611.mp3');
            audio.play()
        })

        $(document).on('click', '.change-price', () => {
            if (this._urls) {
                let price = $('#price').val()

                if (!price) return alert('Please confirm the Rate');
                price = parseFloat(price)
                if (price < 0) return alert('Must be higher than 0')

                this._socket.emit('change-price', price)
            } else {
                alert('Got some issues')
                $('.add-url').prop('disabled', true)
            }
        })

        const _self = this

        $(document).on('click', '.remove-url', function() {
            if(confirm('Are you sure to delete?')) {
                const url = $(this).parent().parent().data('url');
                // console.log(url)
                _self._urls = _self._urls.filter(item => item !== url);
                _self._socket.emit('delete-url', url);

                $(this).parent().parent().remove()
            }
        })
    }
}