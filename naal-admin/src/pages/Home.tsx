import React, { Component, ReactChild, ReactFragment } from "react";
import { Box, Grid, Heading, Main, Button, Text, Paragraph, DataTable, Avatar, Header, Menu, Card, CardHeader, CardBody, CardFooter, Table, TableHeader, TableRow, TableCell, TableBody, Tab, Form, FormField, TextInput } from 'grommet';
import { Octokit } from '@octokit/core';
import Cookies from 'js-cookie';
import Skeleton from "react-loading-skeleton";
import { enviroment } from "../env";
import base64 from 'base-64';
import { FormEdit } from 'grommet-icons';
import Spinner from 'react-spinkit';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import cogoToast from 'cogo-toast';
import { RouteComponentProps } from "react-router-dom";

interface Link {
    linkID: string,
    linkTitle: string,
    linkTo: string
}

interface naalLinks {
    links: Array<Link>
}
interface Props extends RouteComponentProps<any> { }

class Home extends Component<Props, { token: string | undefined, loading: boolean, gitUser: any | undefined, naalContent: any | undefined, editModalOpen: boolean, modalState: Link, currentRepo: string, currentSHA: string }> {
    OKit: Octokit | undefined;

    constructor(Props: any) {
        super(Props);
        this.state = {
            token: "",
            currentSHA: "",
            editModalOpen: true,
            loading: true,
            currentRepo: "",
            gitUser: {

            },
            modalState: {
                linkTitle: '',
                linkID: '/',
                linkTo: '/'
            },

            naalContent: undefined
        }
    }



    componentDidMount() {
        if (Cookies.get("SESSION_ID")) {


            const octokit = Octokit.defaults({
                auth: Cookies.get("SESSION_ID"),
                userAgent: "naal-dev/0.1",
            });

            this.setState({
                token: Cookies.get("SESSION_ID") ? Cookies.get("SESSION_ID") : ""
            });


            this.OKit = new octokit();
            this.getUser();
            this.getNaalLinks().then(e => {
                this.setState({
                    naalContent: this.processNaalLinks(e)
                });
            })

        }
        else {
            this.props.history.push('/');
        }

    }

    async getUser() {
        let ans = await this.OKit?.request('GET /user');
        this.setState({ loading: false, gitUser: ans?.data })
    }

    async getNaalLinks() {
        let ans = await this.OKit?.request('GET /user/repos');
        let repos = ans?.data.filter(x => x.name == enviroment.access);
        if (repos?.length !== 1) {
            return { "error": "unable to locate links repo" }
        } else {
            let content = await this.OKit?.request(`GET /repos/${repos[0].owner?.login}/${enviroment.access}/contents/links.json`);
            this.setState({ currentRepo: `/repos/${repos[0].owner?.login}/${enviroment.access}/contents/links.json`, currentSHA: content?.data.sha });
            console.log(content?.data);

            let generatedJSON = base64.decode(content?.data.content);
            return JSON.parse(generatedJSON);
        }

    }

    processNaalLinks(naalLinks: naalLinks | undefined) {

        if (naalLinks == undefined) {
            return [];
        }
        else {
            console.log(naalLinks);
            return naalLinks.links.map(e => {
                return {
                    linkID: e.linkID,
                    linkTitle: e.linkTitle,
                    linkTo: e.linkTo,
                    action: <Button label='edit' onClick={() => { this.openModal(e) }} />
                }
            })
        }
    }

    openModal(id?: Link | undefined) {
        if (!id) {
            this.setState({
                modalState: {
                    linkTitle: '',
                    linkID: '/',
                    linkTo: '/'
                },
                editModalOpen: true
            })
        }
        else {
            this.setState({
                modalState: id,
                editModalOpen: true
            })
        }
    }

    applyModalChange(change: any) {
        let id = change.target.id;
        let value = change.target.value;

        console.log(change.target.id)
        console.log(change.target.value);

        this.setState((state) => {
            if (id.includes("linkTitle")) {
                let modifi: any = state.modalState;
                modifi.linkTitle = value;
                return { modalState: modifi }
            }
            else if (id.includes("linkID")) {
                let modifi: any = state.modalState;
                modifi.linkID = value;
                return { modalState: modifi }
            }
            else if (id.includes("linkTo")) {
                let modifi: any = state.modalState;
                modifi.linkTo = value;
                return { modalState: modifi }
            }
            else {
                return { modalState: state.modalState }
            }
        })
    }

    async sendModalChange() {
        this.setState({
            editModalOpen: false
        })

        cogoToast.loading('naal is cmmiting changes 👀', { position: 'top-right' });

        this.setState({ loading: true });

        let fullModification = this.state.naalContent;
        fullModification = fullModification.map((e: Link) => {
            return {
                linkID: e.linkID,
                linkTitle: e.linkTitle,
                linkTo: e.linkTo
            }
        });

        let existingLink: Link = fullModification.find((e: Link) => {
            if (e.linkID == this.state.modalState.linkID) {
                return this.state.modalState;
            }
        })

        if (existingLink) {
            fullModification = fullModification.map((e: Link) => {
                if (e.linkID == existingLink.linkID) {
                    return this.state.modalState
                }
                else {
                    return e;
                }
            });
        }
        else {
            fullModification.push(this.state.modalState);
        }

        console.log(fullModification);

        let resp = await this.OKit?.request(`PUT ${this.state.currentRepo}`, {
            message: 'naal: automated 🔗 update.',
            content: base64.encode(JSON.stringify({ links: fullModification })),
            sha: this.state.currentSHA
        })

        if (resp?.status == 200) {
            cogoToast.success('changes applied! 🥳 ✅', { position: 'top-right' });


            this.getNaalLinks().then(e => {
                this.setState({
                    naalContent: this.processNaalLinks(e)
                });

            });
        } else {
            cogoToast.error('naal has encountered an error! 👺', { position: 'top-right' });
            console.log(resp);
        }

    }

    render() {
        return (
            <React.Fragment>
                <Modal open={this.state.editModalOpen} onClose={() => { this.setState({ editModalOpen: false }) }} center >
                    <Heading style={{ fontWeight: 700 }}>{this.state.modalState?.linkTo && this.state.modalState.linkTo === '/' ? 'NEW' : 'EDIT'}</Heading>
                    <Form>
                        <FormField name="linkTitle" htmlFor="linkTitle-input-id" label="Title">
                            <TextInput id="linkTitle-input-id" name="linkTitle" value={this.state.modalState.linkTitle} onChange={this.applyModalChange.bind(this)} />
                        </FormField>
                        <FormField name="linkID" htmlFor="linkID-input-id" label="ID">
                            <TextInput id="linkID-input-id" name="linkID" value={this.state.modalState.linkID} onChange={this.applyModalChange.bind(this)} />
                        </FormField>
                        <FormField name="linkTo" htmlFor="linkTo-input-id" label="To">
                            <TextInput id="linkTo-input-id" name="linkTo" value={this.state.modalState.linkTo} onChange={this.applyModalChange.bind(this)} />
                        </FormField>
                        <Box direction="row" gap="medium" style={{ marginTop: 30, marginBottom: 15 }}>
                            <Button type="submit" primary label="Submit" onClick={this.sendModalChange.bind(this)} />
                        </Box>
                    </Form>
                </Modal>

                <Grid style={{ height: '100%' }} areas={[
                    { name: "content", start: [0, 0], end: [3, 0] }
                ]}
                    columns={['small', 'flex', 'fit']}
                    rows={['4/4']}
                    gap='small'>

                    <Box gridArea='content' background='brand'>
                        <Header background="dark-1" direction='row' style={{ position: 'absolute', zIndex: 4, top: 0, margin: 0, padding: 0, width: '100%' }} >
                            <Text size='25px' color='dark-4' style={{ marginLeft: 30, fontWeight: 'lighter' }}>naal. – 🔗 portal</Text>
                            <Menu style={{ marginRight: 30 }} label={<div style={{ display: 'flex', alignContent: 'center', justifyContent: 'center' }}>
                                <Avatar src={this.state.gitUser.avatar_url} /> <Text style={{ alignSelf: 'center', marginLeft: 10 }}>@{this.state.gitUser.login}</Text></div>}
                                items={[{ label: 'logout', href: enviroment.debug ? 'http://localhost:3001/auth/logout' : '/auth/logout' }]} />
                        </Header>
                        <Main pad="large">
                            {<Heading style={{ marginTop: 40 }}>Welcome, {this.state.gitUser.name}</Heading>}
                            <Paragraph margin="0px 0px 25px 0px">
                                You have successfully signed on!
                            </Paragraph>

                            <div>
                                <Heading size="small" color="dark-4">CURRENT</Heading>
                                {this.state.naalContent == undefined ? <Spinner name="pulse" color='#547aa5' /> : <React.Fragment>
                                    <Button secondary label={'Add link'} onClick={() => { this.openModal() }} />
                                    <DataTable style={{ marginTop: 15 }} columns={[
                                        {
                                            property: 'linkID',
                                            header: <Text>ID</Text>,
                                            primary: true
                                        },
                                        {
                                            property: 'linkTitle',
                                            header: 'Title'
                                        },
                                        {
                                            property: 'linkTo',
                                            header: 'Destination'
                                        },
                                        {
                                            property: 'action',
                                            header: 'Action'
                                        },
                                    ]}
                                        data={this.state.naalContent ? this.state.naalContent : []}

                                    />
                                </React.Fragment>}
                            </div>

                        </Main>
                    </Box>
                </Grid>
            </React.Fragment>

        );
    }
}

export default Home;