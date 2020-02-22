import React, { Component } from 'react';
import gitLogo from './gihubLogo.svg';

class Footer extends Component {
    render() {
        return (
            <a
                href="https://github.com/34x4p08/curve-stats"
                target="_blank"
                rel="noopener noreferrer"
            >
                <img
                    src={gitLogo}
                    alt="github-logo"
                    style={{ maxWidth: '3vh' }}
                />
            </a>
        );
    }
}

export default Footer;
