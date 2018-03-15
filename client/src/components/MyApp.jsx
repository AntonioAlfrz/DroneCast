import React from 'react'
import Navigator from "./Navigator"
import FormFolder from "./FolderForm"
import ModalDrop from './ModalDrop'
import { Link } from 'react-router-dom'
import Explorer from './Explorer'
import ContentList from './ContentList'
import { Button, Icon, Menu, Divider, Segment } from 'semantic-ui-react'
import request from 'superagent'
import { API_ROOT } from '../api-config';
import CodeList from './CodeList';

/*
const json = {
    "appId": "Test",
    "folders": [
        {
            "name": "Folder1",
            "content": ["Video1", "Video2"]
        }
    ]
}
*/

// Phase: ContentList/Explorer/NewFolder
export default class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: { name: "", folders: [] },
            currentIndex: undefined,
            ready: false,
            phase: 'explorer'
        }
        this.handleBackClick = this.handleBackClick.bind(this);
        this.getData = this.getData.bind(this);
        this.handleAddFolder = this.handleAddFolder.bind(this)
        this.handleSubmitFolder = this.handleSubmitFolder.bind(this)
        this.handleRemoveFolder = this.handleRemoveFolder.bind(this)
        this.handleFolderClick = this.handleFolderClick.bind(this)
        this.handleNavClick = this.handleNavClick.bind(this)
        this.Display = this.Display.bind(this)
    }

    componentDidMount() {
        this.getData()
    }

    getData() {
        request
            .get(API_ROOT + 'apps/find/' + this.props.match.params.id)
            .then((response) => {
                const data =
                    {
                        name: response.body.name,
                        folders: response.body.appdata.folders
                    }
                this.setState({ data: data, ready: true });
            })
            .catch((error) => {
                console.log(error)
                return [error]
            })
    }

    handleSubmitFolder(name, type) {
        let newFolder
        switch (type) {
            case 'code':
                newFolder = {
                    "name": name,
                    'type': type,
                    "content": {
                        "phone": [],
                        "drone": []
                    }
                };
                break
            default:
                newFolder = {
                    "name": name,
                    'type': type,
                    "content": []
                };
                break
        }
        const folders = [...this.state.data.folders, newFolder]
        const newJson = {
            ...this.state.data,
            folders: folders
        }
        this.setState({ data: newJson, phase: 'explorer' }, this.updateData)
    }
    handleAddFolder() {
        this.setState({ phase: 'newfolder' })
    }

    handleRemoveFolder(event, { value }) {
        const { folders } = this.state.data
        const newFolders = folders.filter(folder => folder.name !== value)
        const newJson = {
            ...this.state.data,
            folders: newFolders
        }
        this.setState({ data: newJson }, this.updateData)
    }

    handleFolderClick(event, { value }) {
        this.setState({
            phase: 'contentlist',
            currentIndex: value
        })
    }

    handleNavClick(type) {
        //this.updateData()
        this.setState({
            phase: 'explorer',
            currentIndex: undefined
        })
    }

    updateData() {
        const { folders } = this.state.data
        request
            .put(API_ROOT + 'apps/update/' + this.props.match.params.id)
            .send({ folders: folders })
            .then((response) => {
            })
            .catch((error) => {
                console.log(error)
                return [error]
            })
    }

    handleBackClick() {
        this.updateData()
    }

    // Switch display
    Display(props) {
        const { folders } = this.state.data
        const { currentIndex, phase } = this.state
        // CurrentIndex can also be 0
        const currentFolder = currentIndex !== undefined ? folders[currentIndex] : undefined
        switch (phase) {
            case 'contentlist':
                if (currentFolder.type === 'content') {

                    return <ContentList content={currentFolder.content} />
                } else {

                    return <CodeList
                        folderName={currentFolder.name}
                        code={currentFolder.content}
                        index={currentIndex}
                        appid={this.props.match.params.id}
                        getData={this.getData} />
                }

            case 'newfolder':
                return <FormFolder addCallback={this.handleSubmitFolder} />
            // Explorer
            default:
                return <Explorer
                    addCallback={this.handleAddFolder}
                    removeCallback={this.handleRemoveFolder}
                    folders={folders}
                    appid={this.props.match.params.id}
                    handleClick={this.handleFolderClick} />
        }
    }

    render() {
        const { name, folders } = this.state.data
        const { ready, currentIndex } = this.state
        // currentIndex can be 0
        const currentFolder = currentIndex !== undefined ? folders[currentIndex] : undefined
        const currentFolderName = currentFolder ? currentFolder.name : undefined

        return (
            <div>
                <Menu secondary>
                    <Menu.Item>
                        <Link to="/">
                            <Button icon labelPosition='left' onClick={this.handleBackClick}>
                                <Icon name='reply' />
                                Back
                            </Button>
                        </Link>
                    </Menu.Item>
                    {currentFolder && currentFolder.type === 'content' &&
                        <Menu.Item position="right">
                            <ModalDrop
                                folderName={currentFolderName}
                                index={currentIndex}
                                appid={this.props.match.params.id}
                                getData={this.getData} />
                        </Menu.Item>}
                </Menu>
                <Navigator
                    id={name}
                    folder={currentFolderName}
                    handleClick={this.handleNavClick} />
                <Divider horizontal />
                <Segment color='teal' loading={!ready}>
                    <this.Display />
                </Segment>
            </div>
        );
    }
}