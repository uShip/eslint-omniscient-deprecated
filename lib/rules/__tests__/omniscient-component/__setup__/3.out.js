import React from 'react';
import PropTypes from 'prop-types';
import component from 'omniscient';
import classNames from 'classnames';
import noop from 'lodash/fp/noop';
import { FlexItem, FlexRow, align } from '../layout/flexBox';
import Icon from '../Icon';
import { iconSize } from '../constants';
import DateTextField from './DateTextField';

import './_date-field.scss';

class DateField extends React.Component {
    static defaultProps = {
        onFocus: noop,
        onBlur: noop,
        activate: false,
        type: "text"
    };

    static propTypes = {
        activate: PropTypes.bool,
        onFocus: PropTypes.func
    };

    static displayName = "DateField";

    validationMessageStrategy = (props, state) => {
        //1. if user focused & blurred --> both true
        //2, or if the user hasn't interacted with the field --> both false
        // show error message if exists.

        //#1 ensures that we don't validate the date too soon when the user is typing
        //#2 ensures that when component loads with an invalid date value, the error message
        //is visible to user.
        return state.userHasBlurred === this.state.userHasFocused;
    };

    handleFocus = (...args) => {
        if (this.dateTextField) this.dateTextField.select();
        this.props.onFocus(...args);
        this.setState({ userHasFocused: true });
    };

    componentDidUpdate = prevProps => {
        // not checking if the prop changed, will result in infinite loop
        if (this.props.activate && !prevProps.activate && this.dateTextField) {
            this.dateTextField.focus();
        }
    };

    state = {
        userHasFocused: false
    };

    render() {
        const {
            placeholder,
            label,
            isDisabled,
            cValue,
            activate,
            locale,
            shortDateLocale,
            dateFormat,
            isNativeDatePicker,
            type,
            onBlur,
            validate
        } = this.props;
        const userInputCls = classNames("dateField-userInput", {
            "is-active": activate
        });

        return (
            <FlexRow noWrap smallAlign={align.CENTER} className="dateField">
                <FlexItem auto>
                    <Icon
                        iconId="calendar"
                        className="dateField-icon"
                        size={iconSize.MEDIUM}
                    />
                </FlexItem>
                <FlexItem className={userInputCls}>
                    <DateTextField
                        type={type}
                        inputRef={field => (this.dateTextField = field)}
                        label={label}
                        onBlur={onBlur}
                        onFocus={this.handleFocus}
                        cValue={cValue}
                        isDisabled={isDisabled}
                        className="dateField-textField"
                        placeholder={placeholder}
                        dateFormat={dateFormat}
                        isNativeDatePicker={isNativeDatePicker}
                        locale={locale}
                        shortDateLocale={shortDateLocale}
                        messageStrategy={this.validationMessageStrategy}
                        validate={validate}
                    />
                </FlexItem>
            </FlexRow>
        );
    }
}

export default DateField;
