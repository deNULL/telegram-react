/*
 *  Copyright (c) 2019, Denis Olshin
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@material-ui/core/styles/withStyles';
import { withTranslation } from 'react-i18next';
import Footer from './Footer';
import { compose } from 'recompose';

const styles = theme => ({
    loggingOutStub: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        color: theme.palette.text.primary,
        width: '50%',
        height: 200,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 'auto',
        lineHeight: '200px',
        textAlign: 'center',
        fontSize: '25px',
        opacity: 0.6,
        borderRadius: '8px'
    }
});

class LoggingOutPage extends React.Component {
    render() {
        const { classes, t } = this.props;

        return (
            <>
                <div className='header-wrapper' />
                <div className='page'>
                    <div className={classNames(classes.loggingOutStub, 'loggingOutStub')}>{t('LoggingOut')}</div>
                </div>
                <Footer />
            </>
        );
    }
}

LoggingOutPage.propTypes = {};

const enhance = compose(
    withTranslation(),
    withStyles(styles)
);

export default enhance(LoggingOutPage);
