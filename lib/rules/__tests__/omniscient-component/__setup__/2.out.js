import React from "react";
import PropTypes from "prop-types";
import component from "omniscient";
import BaseButton from "./BaseButton";
import Icon from "../Icon";

function IconSplitButton(props) {
    const icon = React.Children.only(props.children);

    return (
        <BaseButton {...props} ariaLabel={props.ariaLabel}>
            {icon}
        </BaseButton>
    );
}
IconSplitButton.displayName = "IconSplitButton";
IconSplitButton.propTypes = {
    children: PropTypes.shape({ type: PropTypes.oneOf([Icon]) }).isRequired,
    ariaLabel: PropTypes.string
};

export default IconSplitButton;
