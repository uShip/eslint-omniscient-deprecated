import React from "react";
import PropTypes from "prop-types";
import component from "omniscient";
import BaseButton from "./BaseButton";
import Icon from "../Icon";

const IconSplitButton = component(
    "IconSplitButton",
    {
        propTypes: {
            children: PropTypes.shape({ type: PropTypes.oneOf([Icon]) }).isRequired,
            ariaLabel: PropTypes.string,
        },
    },
    props => {
        const icon = React.Children.only(props.children);

        return (
            <BaseButton {...props} ariaLabel={props.ariaLabel}>
                {icon}
            </BaseButton>
        );
    }
);

export default IconSplitButton;
