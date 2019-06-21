/*
 *  Copyright (c) 2019, Denis Olshin
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import CallIcon from '@material-ui/icons/Call';
import withStyles from '@material-ui/core/styles/withStyles';
import { withTranslation } from 'react-i18next';
import { compose } from 'recompose';
import { getMessageCallType } from '../../../Utils/Message';
import { getDurationApproximateString } from '../../../Utils/Common';
import './Call.css';

const styles = theme => ({
    callIcon: {
        color: theme.palette.primary.main,
        height: '36px'
    }
});

class Call extends React.Component {
    render() {
        const { call, openMedia, classes, t } = this.props;
        if (!call) return null;

        const callType = getMessageCallType(call, t);
        const duration = getDurationApproximateString(call.content.duration, t);

        return (
            <div className='call'>
                <div className={classes.callIcon}>
                    <CallIcon fontSize='large' />
                </div>
                <div className='call-content'>
                    <div className='call-title'>{callType}</div>
                    <div className='call-duration'>{duration || t('CallCancelled')}</div>
                </div>
            </div>
        );
    }
}

Call.propTypes = {
    chatId: PropTypes.number.isRequired,
    messageId: PropTypes.number.isRequired,
    call: PropTypes.object.isRequired,
    openMedia: PropTypes.func.isRequired
};

const enhance = compose(
    withTranslation(),
    withStyles(styles, { withTheme: true })
);

export default enhance(Call);
