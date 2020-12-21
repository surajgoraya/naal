import React, { Component, ReactChild, ReactFragment } from "react";
import { Box, Grid, Heading, Main, Button, Text, Paragraph } from 'grommet';
import { enviroment } from '../env';
import Cookies from 'js-cookie';
import { RouteComponentProps } from 'react-router-dom';

interface Props extends RouteComponentProps<any>{}

class Login extends Component <Props> {
    constructor(Props: any) {
        super(Props);
    }

    componentDidMount(){
        //If the user has a existing login cookie submit directly to home
        if (Cookies.get('SESSION_ID') !== undefined){
            this.props.history.push('/home');
        }
    }

    render() {
        return (
            <Grid style={{height: '100%'}} areas={[
                { name: "content", start: [0, 0], end: [3, 0] }
            ]}
                columns={['small', 'flex', 'fit']}
                rows={['4/4']}
                gap='small'>
                <Box gridArea='content' background='brand'>
                    <Main pad="large">
                        <Heading>Login into Naal.</Heading>
                        <Paragraph margin="0px 0px 25px 0px">
                            Naal is a open source link
                            managment tool. Authentication
                            is requried to manage links. 
                            
                        </Paragraph>
                        <Button primary alignSelf='start' label={"Login with Github"} href={enviroment.debug ? "http://localhost:3001/auth/authenticate/" : "/auth/authenticate/"} />
                    </Main>
                </Box>
            </Grid>

        );
    }
}

export default Login;