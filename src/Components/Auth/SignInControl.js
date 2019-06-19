/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import withStyles from '@material-ui/core/styles/withStyles';
import { withTranslation } from 'react-i18next';
import { compose } from 'recompose';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { isValidPhoneNumber } from '../../Utils/Common';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import OptionStore from '../../Stores/OptionStore';
import LocalizationStore from '../../Stores/LocalizationStore';
import TdLibController from '../../Controllers/TdLibController';
import './SignInControl.css';
import { callingCountries } from 'country-data';
import CountryLanguage from 'country-language';

const styles = {
    button: {
        margin: '16px 0 0 0'
    },
    phone: {
        fontWeight: 'bold',
        textAlign: 'center'
    },
    continueAtLanguage: {
        transform: 'translateY(100px)',
        textAlign: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0
    }
};

let countryCodesMap = {};
for (let country of callingCountries.all) {
    for (let code of country.countryCallingCodes) {
        countryCodesMap[code.replace(/\D+/g, '')] = country.alpha2;
    }
}

const languageRegionRegexp = /^(?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))$|^((?:[a-z]{2,3}(?:(?:-[a-z]{3}){1,3})?)|[a-z]{4}|[a-z]{5,8})(?:-([a-z]{4}))?(?:-([a-z]{2}|\d{3}))?((?:-(?:[\da-z]{5,8}|\d[\da-z]{3}))*)?((?:-[\da-wy-z](?:-[\da-z]{2,8})+)*)?(-x(?:-[\da-z]{1,8})+)?$|^(x(?:-[\da-z]{1,8})+)$/i;

class SignInControl extends React.Component {
    state = {
        error: null,
        loading: false
    };

    constructor(props) {
        super(props);

        if (props.phoneCode === null) {
            const lang = languageRegionRegexp.exec(navigator.language);
            if (lang && lang[5]) {
                this.state.countryCode = countryCodesMap[lang[5]];
            } else {
                const countries = CountryLanguage.getLanguageCountries(navigator.language);
                if (countries && countries.length) {
                    this.state.countryCode = countries[0].code_2;
                }
            }

            for (let country of callingCountries.all) {
                if (country.alpha2 === this.state.countryCode) {
                    this.state.phoneCode = country.countryCallingCodes[0];
                }
            }
        } else {
            this.state.countryCode = countryCodesMap[props.phoneCode.replace(/\D+/g, '')] || 'Unknown';
            this.state.phoneCode = props.phoneCode;
        }
    }

    componentDidMount() {
        this.handleSuggestedLanguagePackId();

        OptionStore.on('updateOption', this.handleUpdateOption);
    }

    componentWillUnmount() {
        OptionStore.removeListener('updateOption', this.handleUpdateOption);
    }

    handleUpdateOption = update => {
        const { name } = update;

        if (name === 'suggested_language_pack_id') {
            this.handleSuggestedLanguagePackId();
        }
    };

    handleSuggestedLanguagePackId = () => {
        const { i18n } = this.props;
        if (!i18n) return;

        const languagePackId = OptionStore.get('suggested_language_pack_id');
        if (!languagePackId) return;

        const { value } = languagePackId;
        if (value === i18n.language) {
            this.setState({ suggestedLanguage: null });
            return;
        }

        LocalizationStore.loadLanguage(value).then(() => {
            this.setState({ suggestedLanguage: value });
        });
    };

    handleNext = () => {
        let { phoneNumber, phoneCode } = this.props;

        phoneCode = this.state.phoneCode || phoneCode || '';
        phoneNumber = this.state.phoneNumber || phoneNumber || '';

        if (isValidPhoneNumber(phoneCode + phoneNumber)) {
            this.setState({ error: null, openConfirmation: true });
        } else {
            this.setState({ error: { code: 'InvalidPhoneNumber' } });
        }
    };

    handleCountryChange = event => {
        for (let country of callingCountries.all) {
            if (country.alpha2 === event.target.value) {
                this.setState({
                    countryCode: event.target.value,
                    phoneCode: country.countryCallingCodes[0]
                });
            }
        }
    };

    handleCodeChange = event => {
        this.setState({
            phoneCode: event.target.value,
            countryCode: countryCodesMap[event.target.value.replace(/\D+/g, '')] || 'Unknown'
        });
    };

    handleNumberChange = event => {
        this.phoneNumber = event.target.value;
    };

    handleKeyPress = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleNext();
        }
    };

    handleDone = () => {
        let { phoneCode, phoneNumber, onPhoneEnter } = this.props;

        phoneCode = this.state.phoneCode || phoneCode || '';
        phoneNumber = this.state.phoneNumber || phoneNumber || '';

        if (!isValidPhoneNumber(phoneCode + phoneNumber)) {
            this.setState({ error: { code: 'InvalidPhoneNumber' } });
            return;
        }

        onPhoneEnter(phoneCode, phoneNumber);
        this.setState({ error: null, loading: true });
        TdLibController.send({
            '@type': 'setAuthenticationPhoneNumber',
            phone_number: phoneCode + phoneNumber
        })
            .then(result => {})
            .catch(error => {
                let errorString = null;
                if (error && error['@type'] === 'error' && error.message) {
                    errorString = error.message;
                } else {
                    errorString = JSON.stringify(error);
                }

                this.setState({ error: { string: errorString } });
            })
            .finally(() => {
                this.setState({ loading: false });
            });
    };

    handleChangeLanguage = () => {
        const { i18n } = this.props;
        const { suggestedLanguage } = this.state;

        if (!i18n) return;
        if (!suggestedLanguage) return;

        this.setState({ suggestedLanguage: i18n.language });

        TdLibController.clientUpdate({ '@type': 'clientUpdateLanguageChange', language: suggestedLanguage });
    };

    render() {
        const { phoneNumber, classes, t } = this.props;
        const { loading, error, suggestedLanguage, countryCode, phoneCode } = this.state;

        let errorString = '';
        if (error) {
            const { code, string } = error;
            if (code) {
                errorString = t(code);
            } else {
                errorString = string;
            }
        }

        return (
            <FormControl fullWidth>
                <div className='authorization-header'>
                    <span className='authorization-header-content'>{t('YourPhone')}</span>
                </div>
                <div>{t('StartText')}</div>

                <Select
                    className='country-select'
                    disabled={loading}
                    margin='normal'
                    value={countryCode}
                    onChange={this.handleCountryChange}>
                    {callingCountries.all.map(country => (
                        <MenuItem value={country.alpha2}>{country.name}</MenuItem>
                    ))}
                </Select>
                <div className='phone-row'>
                    <TextField
                        className='phone-code'
                        color='primary'
                        disabled={loading}
                        id='phoneCode'
                        label={t('Code')}
                        margin='normal'
                        value={phoneCode}
                        onChange={this.handleCodeChange}
                    />
                    <TextField
                        color='primary'
                        className='phone-number'
                        disabled={loading}
                        error={Boolean(errorString)}
                        autoFocus
                        id='phoneNumber'
                        label={t('YourPhone')}
                        margin='normal'
                        onChange={this.handleNumberChange}
                        onKeyPress={this.handleKeyPress}
                        defaultValue={phoneNumber}
                    />
                </div>
                <FormHelperText id='sign-in-error-text'>{errorString}</FormHelperText>
                <div className='sign-in-actions'>
                    <Button
                        fullWidth
                        color='primary'
                        disabled={loading}
                        className={classes.button}
                        onClick={this.handleDone}>
                        {t('Next')}
                    </Button>
                    <Typography className={classes.continueAtLanguage}>
                        <Link onClick={this.handleChangeLanguage}>
                            {Boolean(suggestedLanguage) ? t('ContinueOnThisLanguage', { lng: suggestedLanguage }) : ' '}
                        </Link>
                    </Typography>
                </div>
            </FormControl>
        );
    }
}

const enhance = compose(
    withTranslation(),
    withStyles(styles, { withTheme: true })
);

export default enhance(SignInControl);
