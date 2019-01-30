import component from "omniscient";
import PropTypes from "prop-types";
import moment from "moment";
import classNames from "classnames";
import noop from "lodash/fp/noop";
import getNextId from "../../util/getNextId";
import CustomPropTypes from "../../util/customPropTypes";
import calendarFactory from "./calendarFactory";
import { getMomentDate } from "./momentDateHelpers";
import MomentPropTypes from "./momentPropTypes";

import "./_calendar.scss";

//TODO: use enums for locale
const DateCalendar = component(
    "DateCalendar",
    {
        propTypes: {
            onOpen: PropTypes.func,
            onClose: PropTypes.func,
            minDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), MomentPropTypes.momentObject]),
            maxDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), MomentPropTypes.momentObject]),
            onDateSelected: PropTypes.func,
            locale: PropTypes.string,
            cSelectedDate: CustomPropTypes.cursor,
            defaultDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), MomentPropTypes.momentObject]),
            className: PropTypes.string,
        },

        getDefaultProps() {
            return {
                minDate: moment().startOf("day"),
                defaultDate: moment(),
                locale: "en-US",
                onDateSelected: noop,
            };
        },

        componentDidMount() {
            const minDateMoment = getMomentDate(this.props.minDate, this.props.locale);
            const maxDateMoment = getMomentDate(this.props.maxDate, this.props.locale);
            const selectedDateMoment = getMomentDate(this.props.cSelectedDate);
            const startWithMonth = selectedDateMoment.isValid() ? selectedDateMoment : this.props.defaultDate;

            this.dateCalendar = calendarFactory.create(this.rootNode, getNextId(), {
                preselectedSelectedDate: this.props.cSelectedDate.deref(),
                startWithMonth,
                canSelectRange: false,
                type: "calendar",
                momentLocale: this.props.locale,
                canBrowsePastMonths: true,
                canBrowseFutureMonths: true,
                adjacentDaysChangeMonth: false,
                selectMin: minDateMoment.isValid() ? minDateMoment.startOf("day") : null,
                selectMax: maxDateMoment.isValid() ? maxDateMoment.endOf("day") : null,
                showApplyButton: false,
            });

            // we cant pass events during initialization, because of limitations
            // in calendarFactory
            this.dateCalendar.events.onDatepickerOpen = this.props.onOpen;
            this.dateCalendar.events.onDatepickerClose = this.props.onClose;
            this.dateCalendar.events.onClear = this.props.handleClear;
            this.dateCalendar.events.onDateSelected = this.handleDateSelected;
        },

        componentDidUpdate() {
            const currentSelectedDate = getMomentDate(this.props.cSelectedDate, this.props.locale);
            if (!currentSelectedDate.isValid()) {
                this.dateCalendar.setSelectedDate(undefined);
            } else {
                this.dateCalendar.events.onDateSelected = undefined;
                this.dateCalendar.setSelectedDate(currentSelectedDate);
                this.dateCalendar.events.onDateSelected = this.handleDateSelected;
            }

            const minDateMoment = getMomentDate(this.props.minDate, this.props.locale);
            const maxDateMoment = getMomentDate(this.props.maxDate, this.props.locale);
            this.dateCalendar.setSelectMin(minDateMoment.isValid() ? minDateMoment.startOf("day") : null);
            this.dateCalendar.setSelectMax(maxDateMoment.isValid() ? maxDateMoment.endOf("day") : null);
        },

        handleDateSelected(data) {
            this.props.cSelectedDate.update(() => {
                const newDate = getMomentDate(data.selectedDate, this.props.locale);
                return newDate.isValid() ? newDate : null;
            });
            this.props.onDateSelected(data);
        },
    },
    function({ className }) {
        const cls = classNames("dateCalendar", className);
        return <div className={cls} ref={node => (this.rootNode = node)} />;
    }
);

export default DateCalendar;
