import { isEqualImmutable } from "ImmutableComponent";
import React from "react";
import PropTypes from "prop-types";
import component from "omniscient";
import BaseButton from "./BaseButton";
import Icon from "../Icon";

class IconSplitButton extends React.Component {
    static propTypes = {
        children: PropTypes.shape({ type: PropTypes.oneOf([Icon]) }).isRequired,
        ariaLabel: PropTypes.string,
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !(
            isEqualImmutable(this.props, nextProps) &&
            ((!oldState && !newState) || isEqualImmutable(this.state, nextState))
        );
    }

    render() {
        const props = this.props;
        const icon = React.Children.only(props.children);

        return (
            <BaseButton {...props} ariaLabel={props.ariaLabel}>
                {icon}
            </BaseButton>
        );
    }

    static displayName = "IconSplitButton";
}

export default IconSplitButton;
