import React from 'react';
import PropTypes from 'prop-types';
import component from 'omniscient';
import EventEmitter from 'eventemitter3';
import { messageKind } from './constants';
import {
    validationContextShape,
    warnWhileDebugging,
    defaultGetValidation
} from './ValidationRoot';

function withValidation(Component) {
    return (() => {
    class AnonymousComponent extends React.Component {
        static state = {
            formWasSubmitted: false
        };

        static contextTypes = {
            formContext: PropTypes.shape({
                submissionState: PropTypes.instanceOf(EventEmitter)
            }),
            validationContext: validationContextShape
        };

        static propTypes = {
            validate: PropTypes.string,
            getValidation: PropTypes.func
        };

        static displayName = Component.displayName + "_withValidation";
        getValidationMessage = () => {
            const { validate, getValidation } = this.props;

            if (
                (!validate && !getValidation) ||
                !this.context.validationContext
            ) {
                return null;
            }

            const validity = this.context.validationContext.get();

            if (!validity) return null;

            const debugContext = {
                instance: this,
                debug: this.context.validationContext.debug,
                getterMethod: this.props.getValidation || this.props.validate,
                parentRecord: validity
            };

            const recordForThisField = this.props.getValidation
                ? warnWhileDebugging(
                      debugContext,
                      this.props.getValidation(validity)
                  )
                : warnWhileDebugging(
                      debugContext,
                      defaultGetValidation(validity, this.props.validate)
                  );

            return recordForThisField.messages &&
                recordForThisField.messages.size
                ? {
                      text: recordForThisField.messages.first(),
                      kind: messageKind.ALERT
                  }
                : null;
        };

        handleClear = () => {
            this.setState(this.getInitialState());
        };

        handleSubmit = () => {
            this.setState({ formWasSubmitted: true });
        };

        componentWillUnmount = () => {
            if (!this.context.formContext) return;
            this.context.formContext.submissionState.removeListener(
                "submit",
                this.handleSubmit
            );
            this.context.formContext.submissionState.removeListener(
                "clear",
                this.handleClear
            );
        };

        componentWillMount = () => {
            if (!this.context.formContext) return;
            this.context.formContext.submissionState.on(
                "submit",
                this.handleSubmit
            );
            this.context.formContext.submissionState.on(
                "clear",
                this.handleClear
            );
        };

        hasWarned = false;

        render() {
            let props = this.props;
            if (!props.message) {
                props = { ...props, message: this.getValidationMessage() };
            }
            return (
                <Component
                    {...props}
                    formWasSubmitted={this.state.formWasSubmitted}
                />
            );
        }
    }

    return AnonymousComponent;
})();
}

export default withValidation;
