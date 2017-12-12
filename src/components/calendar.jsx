'use strict';

import * as React from "react";

import { Locale } from "../lib/locale.js";

class Calendar extends React.Component {
    constructor(props) {
        super(props);

        let startOfWeek = Calendar.getStartOfWeek();

        if (this.props.startOfWeek) {
            startOfWeek = {
                "mon":  0, "monday":    0, "0":   0,
                "sun": -1, "sunday":   -1, "-1": -1,
                "sat": -2, "saturday": -2, "-2": -2
            }[this.props.startOfWeek.toLowerCase()] || startOfWeek;
            if (typeof nextProps === "number") {
                startOfWeek = nextProps.startOfWeek;
            }
        }

        const now = new Date(Date.now());

        this.state = {
            year: props.year || now.getFullYear(),
            month: props.month || now.getMonth() + 1,
            locale: props.locale,
            startOfWeek: startOfWeek,
            calendarDates: {}
        };
    }

    componentWillReceiveProps(nextProps) {
        let startOfWeek = this.state.startOfWeek;

        if (nextProps.startOfWeek) {
            if (nextProps.startOfWeek != this.state.startOfWeek) {
                startOfWeek = {
                    "mon":  0, "monday":    0, "0":   0,
                    "sun": -1, "sunday":   -1, "-1": -1,
                    "sat": -2, "saturday": -2, "-2": -2
                }[nextProps.startOfWeek.toLowerCase()];
                if (startOfWeek === undefined) {
                    startOfWeek = this.state.startOfWeek;
                }
                if (typeof nextProps === "number") {
                    startOfWeek = nextProps.startOfWeek;
                }
            }
        } else if (nextProps.locale) {
            startOfWeek = Calendar.getStartOfWeek(nextProps.locale);
        }

        this.setState({
            year: nextProps.year || this.state.year,
            month: nextProps.month || this.state.month,
            locale: nextProps.locale,
            startOfWeek: startOfWeek
        });
       
        this._isRendering = false;
        this._forcedRenderRequested = false;
        this._forcingRender = false;

        return true;
    }

    render() {
        this._isRendering = true;
        
        let viewStartDate = new Date(this.state.year, this.state.month-1);
        viewStartDate.setDate(
            (1
                - (viewStartDate.getDay() + 6 - this.state.startOfWeek) % 7
                - 7) % 7);

        const current = new Date(Date.now());
        current.setHours(0);
        current.setMinutes(0);
        current.setSeconds(0);
        current.setMilliseconds(0);

        const selectedDate = this.state.selectedDate;

        const result = (
            <table className="calendar">
                <thead className="calendar-header">
                    <tr>
                        <th onClick={ this.prevMonth.bind(this) }>&#x25C0;</th>
                        <th className="calendar-month-label" colSpan={5}>
                        {
                            `${Calendar.getMonthName(this.state.month - 1, this.state.locale)}
                            ${current.getFullYear() !== this.state.year ? ` ${this.state.year}` : ""}`
                        }
                        </th>
                        <th onClick={ this.nextMonth.bind(this) }>&#x25B6;</th>
                    </tr>
                    <tr>
                    {
                        [...new Array(7)].map(
                            (_, index) => {
                                return (
                                    <th key={index}>
                                    {
                                        Calendar.getShortDayName(index, this.state.locale)
                                    }
                                    </th>
                                );
                            }
                        )
                    }
                    </tr>
                </thead>
                <tbody className="calendar-body">
                {
                    [...new Array(6)].map(
                        (_, index) => {
                            let weekStartDate = new Date(viewStartDate);
                            weekStartDate.setDate(weekStartDate.getDate() + 7*index);
                            return renderRow.bind(this)(weekStartDate);
                        }
                    )
                }
                </tbody>
            </table>
        );
        
        this._isRendering = false;
        this._forcingRender = false;
        
        if (this._forcedRenderRequested) {
            this._forcedRenderRequested = false;
            
            this._forcingRender = true;
            
            setTimeout(() => this.forceUpdate(), 0);
        }
        
        return result;

        function renderRow(startDate) {
            return (
                <tr key={ startDate } className="calendar-week">
                {
                    [...new Array(7)].map(
                        (_, index) => {
                            const date = new Date(startDate);
                            date.setDate(date.getDate() + index);
                            return renderDate.bind(this)(date);
                        }
                    )
                }
                </tr>
            );
        }

        function renderDate(date) {
            const isCurrent = date.getTime() === current.getTime();

            const isCurrentMonth =
                this.state.year === date.getFullYear() &&
                this.state.month - 1 === date.getMonth();

            const isSelected =
                selectedDate && selectedDate.getTime() === date.getTime();

            let calendarDate = this.state.calendarDates[date.getTime()];

            if (!calendarDate) {
                calendarDate = new Calendar.CalendarDate(this, date);
                this.state.calendarDates[date.getTime()] = calendarDate;
            }
            
            if (this.props.transformDate && !this._forcingRender) {
                this.props.transformDate(calendarDate);
            }

            return (
                <td key={date}
                    className={
                        `calendar-day${
                            isCurrent ? " calendar-day-current-frame" : ""
                            }${
                            isSelected ? " calendar-day-selected-frame" : ""
                            }${
                            isCurrentMonth ? "" : " calendar-day-not-current-month"
                            }`
                    }
                    onClick={
                        (event) => this.daySelected.bind(this)(event, date)
                    }
                    style={ calendarDate.getStyle() }>
                    {
                        isCurrent || isSelected
                            ? (
                                <div className={
                                    `${
                                        isCurrent ? " calendar-day-current" : ""
                                    }${
                                        isSelected ? " calendar-day-selected" : ""
                                    }`
                                }>
                                    { date.getDate() }
                                </div>
                            )
                            : date.getDate()
                    }
                </td>
            );
        }
    }

    prevMonth() {
        this.setState({
            year: this.state.year - (this.state.month === 1 ? 1 : 0),
            month: this.state.month === 1 ? 12 : this.state.month - 1
        });
    }

    nextMonth() {
        this.setState({
            year: this.state.year + (this.state.month === 12 ? 1 : 0),
            month: this.state.month === 12 ? 1 : this.state.month + 1
        });
    }

    daySelected(event, date) {
        this.setState({
            selectedDate: date
        });

        if (this.props.onDaySelected) {
            this.props.onDaySelected(date);
        }
    }

    static getStartOfWeek(locale = Locale.getDefaultLocale()) {
        if (locale.getTerritory() === "US") {
            return -1;
        }

        return 0;
    }

    static getMonthName(month, locale = Locale.getDefaultLocale()) {
        switch (locale.getLanguage()) {
            case 'sv':
                return [
                    "Januari",
                    "Februari",
                    "Mars",
                    "April",
                    "Maj",
                    "Juni",
                    "Juli",
                    "Augusti",
                    "September",
                    "Oktober",
                    "November",
                    "December"
                ][month];
        }

        return [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ][month];
    }

    static getShortDayName(day, locale = Locale.getDefaultLocale()) {
        switch (locale.getLanguage()) {
            case 'sv':
                return [
                    "Må", "Ti", "On", "To", "Fr", "Lö", "Sö"
                ][day];
        }

        return [
            "Mo", "Ti", "We", "Th", "Fr", "Sa", "Su"
        ][day];
    }

    static CalendarDate = class {
        constructor(calendar, date) {
            this.calendar = calendar;
            this.date = date;
        }

        getDate() {
            return this.date;
        }

        isSelected() {
            return this.calendar.state.selectedDate.getTime() === this.date.getTime();
        }

        isCurrentDay() {
            const current = new Date(Date.now());
            current.setHours(0);
            current.setMinutes(0);
            current.setSeconds(0);
            current.setMilliseconds(0);

            return this.date.getTime() === current.getTime();
        }

        setStatusColor(color) {
            this.statusColor = color;

            if (!this.calendar._forcedRenderRequested) {
                this.calendar._forcedRenderRequested = true;
                if (!this.calendar._isRendering) {
                    this.calendar._forcingRender = true;
                    this.calendar.forceUpdate();
                }
            }
        }

        getStatusColor() {
            return this.statusColor;
        }

        getStyle() {
            if (this.statusColor) {
                return {
                    color: this.statusColor
                };
            }

            return undefined;
        }
    };
}

export { Calendar };
