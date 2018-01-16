import React from 'react'
import { Image, Grid, Transition } from 'semantic-ui-react'


export default class Explorer extends React.Component {

    render() {
        const content = this.props.content.slice()

        return (
            <div>
                {/* Dropzone */}

                <Transition.Group
                    as={Grid}
                    duration={200}
                    divided
                    size='huge'
                    verticalAlign='middle'>
                    <Grid container columns={3}>
                        {content.map((item, index) => (
                            <Grid.Column key={item}>
                                <Image src='http://www.fundacionunam.org.mx/wp-content/uploads/2016/03/herpetarioUNAM1.jpg' avatar />
                                <span>{item}</span>
                            </Grid.Column>
                        ))}
                    </Grid>
                </Transition.Group>
            </div>
        )
    }
}
