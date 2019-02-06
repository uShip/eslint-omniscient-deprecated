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
    return component(
        Component.displayName + '_withValidation',
        {
            propTypes: {
                validate: PropTypes.string,
                getValidation: PropTypes.func
            },

            contextTypes: {
                formContext: PropTypes.shape({
                    submissionState: PropTypes.instanceOf(EventEmitter)
                }),
                validationContext: validationContextShape
            },

            hasWarned: false,

            getInitialState() {
                return {
                    formWasSubmitted: false
                };
            },

            /**
             * Since validation outcome depends on component
             * context (not just props), always re-evaluate
             * @return {Boolean}
             */
            shouldComponentUpdate() {
                return true;
            },

            componentWillMount() {
                if (!this.context.formContext) return;
                this.context.formContext.submissionState.on(
                    'submit',
                    this.handleSubmit
                );
                this.context.formContext.submissionState.on(
                    'clear',
                    this.handleClear
                );
            },

            componentWillUnmount() {
                if (!this.context.formContext) return;
                this.context.formContext.submissionState.removeListener(
                    'submit',
                    this.handleSubmit
                );
                this.context.formContext.submissionState.removeListener(
                    'clear',
                    this.handleClear
                );
            },

            handleSubmit() {
                this.setState({ formWasSubmitted: true });
            },

            handleClear() {
                this.setState(this.getInitialState());
            },

            getValidationMessage() {
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
                    getterMethod:
                        this.props.getValidation || this.props.validate,
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
            }
        },
        function(props) {
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
    );
}

export default withValidation;
