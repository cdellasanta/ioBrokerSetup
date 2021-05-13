# ioBrokerSetup

Purpose is to keep track on changes on my scripts/views (a save point in case of bugs/corruption).

Feel free to contribute (every pull request is welcome), but keep in mind that this repository is for my personal home automation server,
new features are probably best suited to a dedicated repository.

You can use this code under license terms (condider to [![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=JDL4NA8HJN8LL&item_name=Coffee+and+development+infrastructure+support.+Thank+you%21&currency_code=CHF) if you appreciate).

## Current progress

I've very litlle time to dedicate to this personal project, here the current acheevment

![Tour](tour.gif)

Current features:
 - Dynamic menu using [Material Design Widgets for IoBroker VIS](https://github.com/Scrounger/ioBroker.vis-materialdesign) 
 - Multilingual
 - Auto light-dark mode
 - Weather using [Swiss Weather API (SRG-SSR API) adapter](https://www.npmjs.com/package/iobroker.swiss-weather-api) as datasource, integrated with data from [Weatherunderground adapter](https://www.npmjs.com/package/iobroker.weatherunderground).
 - Radar using [Windy.com](https://embed.windy.com/)
 - Sun positioning using [Sonnenverlauf.de](https://www.sonnenverlauf.de)
 - Network and devices view using [UniFi adapter](https://www.npmjs.com/package/iobroker.unifi) based and contributed on [UnifiNetworkState example](https://github.com/Scrounger/ioBroker.vis-materialdesign/tree/master/examples/UnifiNetworkState)  

Yet to come:
 - Roller shutters automation (using wether forcast data, free days calendar and personal google calendars)
 - Google FamilyLink overview / control
 - Securitycams integration
 - Tv contol
 


## License
MIT License

Copyright (c) 2020 cdellasanta <70055566+cdellasanta@users.noreply.github.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
